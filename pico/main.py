from machine import Pin, UART, unique_id
import bluetooth
import time
import random
import struct

# CONFIG

import ujson

def load_config():
    try:
        with open("config.json", "r") as f:
            return ujson.load(f)
    except:
        print("Failed to load config.json")
        return {}

config = load_config()

USER_ID = config.get("user_id", 0)
ROOM_ID = config.get("room_id", "00000000")
NODE_ID = int.from_bytes(unique_id()[:4], "big")



INITIAL_TTL = 5
CACHE_SIZE = 100

REBROADCAST_DELAY_MIN = 20
REBROADCAST_DELAY_MAX = 120

MAX_QUEUE = 50
REPEAT_COUNT = 3

# STATE

ble = bluetooth.BLE()
ble.active(True)

LED = Pin("LED", Pin.OUT)
payload_min_size = 24

seq = 0
seen_packets = {}
relay_schedule = []
adv_queue = []

# PACKET FORMAT (24 bytes)
def encode_packet(user_id, node_id, room_id, lat, lon, ttl, seq_id):

    if isinstance(room_id, str):
        room_id = int(room_id, 16)

    return struct.pack("!BBIIIiiBB",
        0xAB,
        0xCD,
        user_id,
        node_id,
        room_id,
        int(lat * 1e6),
        int(lon * 1e6),
        ttl,
        seq_id
    )

def decode_packet(data):

    header1, header2, user_id, node_id, room_id, lat_raw, lon_raw, ttl, seq_id = struct.unpack("!BBIIIiiBB", data)

    if header1 != 0xAB or header2 != 0xCD:
        return None

    lat = lat_raw / 1e6
    lon = lon_raw / 1e6

    room_hex = "{:08X}".format(room_id)

    return user_id, node_id, room_hex, lat, lon, ttl, seq_id

# PACKET MEMORY

def packet_id(node_id, seq_id):
    return (node_id, seq_id)

def remember(pid):
    seen_packets[pid] = time.ticks_ms()

    if len(seen_packets) > CACHE_SIZE:
        oldest = min(seen_packets, key=seen_packets.get)
        del seen_packets[oldest]

def seen(pid):
    return pid in seen_packets

# ADVERTISEMENT

def queue_packet(payload):
    if len(adv_queue) < MAX_QUEUE:
        for _ in range(REPEAT_COUNT):
            adv_queue.append(payload)

def advertise_packet(payload):
    adv = b'\x02\x01\x06' + bytes([len(payload)+1, 0xFF]) + payload
    ble.gap_advertise(20000, adv)

# BROADCAST

def broadcast(user_id, node_id, lat, lon, ttl, seq_id=None):
    global seq

    if seq_id is None:
        seq_id = seq
        seq = (seq + 1) % 256

    payload = encode_packet(user_id, node_id, ROOM_ID, lat, lon, ttl, seq_id)
    queue_packet(payload)

# RELAY SCHEDULING

def schedule_relay(user_id, node_id, seq_id, lat, lon, ttl):
    delay = random.randint(REBROADCAST_DELAY_MIN, REBROADCAST_DELAY_MAX)
    send_time = time.ticks_add(time.ticks_ms(), delay)

    relay_schedule.append((send_time, user_id, node_id, seq_id, lat, lon, ttl))

def process_relay_queue():
    now = time.ticks_ms()

    i = 0
    while i < len(relay_schedule):
        send_time, user_id, node_id, seq_id, lat, lon, ttl = relay_schedule[i]

        if time.ticks_diff(now, send_time) >= 0:

            print("RELAY TX:",
                  "user_id:", user_id,
                  "node_id:", node_id,
                  "lat:", lat,
                  "lon:", lon,
                  "ttl:", ttl,
                  "seq:", seq_id)

            broadcast(user_id, node_id, lat, lon, ttl, seq_id)
            relay_schedule.pop(i)
        else:
            i += 1

# SCAN HANDLER

def handle_scan(data):
    try:
        addr_type, addr, adv_type, rssi, adv_data = data

        print("SCAN EVENT")

        payload = extract_payload(adv_data)
        if not payload:
            return

        if len(payload) != payload_min_size:
            return

        decoded = decode_packet(payload)
        if not decoded:
            return

        user_id, node_id, room_id, lat, lon, ttl, seq_id = decoded

        print("DECODED:",
              "user:", user_id,
              "node:", node_id,
              "room:", room_id,
              "ttl:", ttl,
              "seq:", seq_id)

        if room_id != ROOM_ID:
            return

        pid = packet_id(node_id, seq_id)

        if seen(pid):
            return

        remember(pid)

        print("RX:", user_id, lat, lon, "TTL:", ttl)

        if ttl > 1:
            schedule_relay(user_id, node_id, seq_id, lat, lon, ttl - 1)

    except:
        pass


def extract_payload(adv_data):

    i = 0
    while i < len(adv_data):

        length = adv_data[i]
        if length == 0:
            break

        ad_type = adv_data[i+1]

        if ad_type == 0xFF:
            return adv_data[i+2:i+1+length]

        i += length + 1

    return None

# BLE IRQ

def irq(event, data):
    if event == 5:
        handle_scan(data)

ble.irq(irq)

# GPS

uart = UART(0, baudrate=9600)

def parse_nmea(line):
    try:
        parts = line.split(',')

        if (line.startswith('$GPRMC') or line.startswith('$GNRMC')) and parts[2] == 'A':

            lat = float(parts[3][:2]) + float(parts[3][2:]) / 60
            if parts[4] == 'S':
                lat = -lat

            lon = float(parts[5][:3]) + float(parts[5][3:]) / 60
            if parts[6] == 'W':
                lon = -lon

            return lat, lon
    except:
        pass

    return None

# START

ble.gap_scan(0)

print("Mesh node ready:", NODE_ID)

last_coords = None
gps_buffer = ""
last_send_time = 0

while True:
    if adv_queue:
        payload = adv_queue.pop(0)
        print("SENDING PACKET:", payload)
        advertise_packet(payload)

    process_relay_queue()

    if uart.any():
        try:
            data = uart.read().decode('utf-8', 'ignore')
        except:
            data = ""

        gps_buffer += data

        while '\n' in gps_buffer:
            line, gps_buffer = gps_buffer.split('\n', 1)
            line = line.strip()

            if not (line.startswith('$GPRMC') or line.startswith('$GNRMC')):
                continue

            print("RMC: ", line)

            coords = parse_nmea(line)

            if coords:
                lat, lon = coords

                now = time.ticks_ms()

                if time.ticks_diff(now, last_send_time) > 1000:
#                     if last_coords is None or abs(lat - last_coords[0]) > 0.00001 or abs(lon - last_coords[1]) > 0.00001:
#                         print("GPS:", lat, lon)
# 
#                         broadcast(
#                             USER_ID,
#                             NODE_ID,
#                             lat,
#                             lon,
#                             INITIAL_TTL
#                         )
#                         last_coords = coords
#                         last_send_time = now

                    print("GPS:", lat, lon)

                    broadcast(
                        USER_ID,
                        NODE_ID,
                        lat,
                        lon,
                        INITIAL_TTL
                    )
                    last_coords = coords
                    last_send_time = now

    time.sleep(0.01)
