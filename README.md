JourneyHawk is a app desigend to help teachers track students on field trips, and can be used on both "iOS" and "Android".

  Both install files can be found here: 
  
      https://drive.google.com/drive/folders/1KgneZEswsEVbBI-2qD6V7eY8xvB47TEZ?usp=drive_link 

  
    INSTALLATION ON IOS (MUST OWN A MAC):

      Ensure you have the propper permissions to install apps onto your device, and that you have bluetooth and location services enabled in the settings of your mobile Apple device.
    
      1) Buy a Mac and install "Xcode" onto your Mac device.
      2) Create an Apple account and set up provisioning profiles with your valid. (YOU DO NOT NEED TO PAY FOR THE APPLE DEVELOPER LICENSE)

           - Official Apple Guide: https://developer.apple.com/help/account/provisioning-profiles/create-a-development-provisioning-profile/ 
           
           Generate and Download the .mobileprovision file.
           
      3) On your Mac, either double click the provisioning file in Xcode to use it, or import it the Signing & Capabilities tab, and searching for the file there. 
      4) Download the .ipa file from the google drive link above in the "ios" subfolder. 
      5) Buy a physical mobile Apple device (simulators will NOT work for this app due to the use of bluetooth services)
      6) In Xcode at the top of the screen, go to: 

            Window -> Devices and Simulators

          (add a device if you havent already (plug the device in, and add it in the bottom left corner))

          and select the device you want to install the app on.

      7) Open "Finder," and drag and drop the .ipa file into where it says "installed apps." After, the installation should begin automatically.
          

    INSTALLATION ON ANDROID:

    Before installing JourneyHawk, please ensure that the Android device allows installation form unknown sources. On Android follow the following instructions:
      1) Download the JourneyHawk .apk file onto your Android device from the link above
      2) Enable Install from Unknown Sources in device settings
      3) Locate the .apk file on your device storage
      4) Tap the .apk file and follow the prompts to install the application
      5) Once installed, open the app and log in



  SETTING UP THE RASPBERRY PI PICO 2W + L76K WAVESHARE GPS MODULE:

    1) Download all files in the "pico" folder in the Github.

    2) Install Thonny and the firmware for the Raspberry pi pico model you have.

        - official guide for installation: https://projects.raspberrypi.org/en/projects/getting-started-with-the-pico/2 

    3) import the files you downloaded in step 1 into the pico.

    4) Edit the config file with the room code you want to be tracked in.

    5) save all your files and run the main file (main auto runs when plugging in the pico)
    
      
There are no additional libraries or dependencies required. The backend runs on the cloud with no extra input from the user.
Your set up of JourneyHawk should be complete!
