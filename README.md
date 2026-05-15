JourneyHawk is an app designed to help teachers track students on field trips, and can be used on both "iOS" and "Android".

  Both install files can be found here: 
  
      https://drive.google.com/drive/folders/1KgneZEswsEVbBI-2qD6V7eY8xvB47TEZ?usp=drive_link 

  
  INSTALLATION ON IOS (MUST SEND ME AN EMAIL WITH APPLE ID INFO (SEND TO: JacobNguyen714@csu.fullerton.edu)):
  
  Ensure you have the proper permissions to install apps onto your device, and that you have bluetooth and location services enabled in the settings of your mobile Apple device.

    1) Send an email to "JacobNguyen714@csu.fullerton.edu" with your Apple ID tied to the device you want to install the app on.
         - After a few hours or business days, look for an email for an invitation to the test flight, you will need this later.
    2) Install two apps from the app store:
  
         i)  TestFlight
         ii) Apple Store Connect
    
    3) Sign into Apple Store Connect with your Apple ID, and go to the website ("appstoreconnect.apple.com"), and accept the terms and conditions.  
    4) Accept the email from step 1.
    5) The app should auto download for your personal use!
  
  INSTALLATION ON ANDROID:
  
  Before installing JourneyHawk, please ensure that the Android device allows installation form unknown sources. On Android follow the following instructions:
    
    1) Download the JourneyHawk .apk file onto your Android device from the link above
    2) Enable Install from Unknown Sources in device settings
    3) Locate the .apk file on your device storage
    4) Tap the .apk file and follow the prompts to install the application
    5) Once installed, open the app and log in


  SETTING UP THE RASPBERRY PI PICO 2W + L76K WAVESHARE GPS MODULE:

    1) Download all files in the "pico" folder in the Github.
    2) Assemble the pico (solder if needed) and plug the receiver into the waveshare module, and the waveshare module into the pico.
    3) Install Thonny and the firmware for the Raspberry pi pico model you have.

        - official guide for installation: https://projects.raspberrypi.org/en/projects/getting-started-with-the-pico/2 

    4) Connect the pico to your computer with the  "BOOTSEL" button on the pico held down, then install the firmware.
    5) Import the files you downloaded in step 1 into the pico.
    6) Unplug then replug the pico without holding down the BOOTSEL button pressed down.
    7) Edit the config file with the room code you want to be tracked in with "Thonny".
    8) save all your files and run the main file (main auto runs when plugging in the pico)
    
      
There are no additional libraries or dependencies required. The backend runs on the cloud with no extra input from the user.
Your set up of JourneyHawk should be complete!
