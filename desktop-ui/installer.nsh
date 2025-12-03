!macro customUnInit
  ; Kill AMPiQ processes before uninstalling
  ; Note: Only killing AMPiQ.exe to avoid affecting other Electron/Node apps
  DetailPrint "Terminating AMPiQ processes..."
  
  ; Kill AMPiQ.exe only - this is safe and specific to our app
  nsExec::ExecToLog 'taskkill /f /im AMPiQ.exe'
  
  ; Wait for processes to terminate
  Sleep 2000
  
  ; Remove native messaging host registry entry
  DetailPrint "Removing native messaging host registration..."
  DeleteRegKey HKCU "SOFTWARE\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native"
  
  ; Remove native host manifest file
  Delete "$INSTDIR\com.ampiq.amp.native.json"
  Delete "$INSTDIR\amp-native-host.js"
  
  DetailPrint "Cleanup completed"
!macroend

!macro customInstall
  ; Register native messaging host for Chrome extension communication
  DetailPrint "Registering native messaging host..."
  
  ; Create native host manifest with absolute path
  FileOpen $0 "$INSTDIR\com.ampiq.amp.native.json" w
  FileWrite $0 '{"name":"com.ampiq.amp.native","description":"AMP Native Messaging Host","path":"$INSTDIR\\amp-native-host.bat","type":"stdio","allowed_origins":["chrome-extension://*/"]}'
  FileClose $0
  
  ; Create batch file to run Node.js script
  FileOpen $0 "$INSTDIR\amp-native-host.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'node "$INSTDIR\resources\app.asar.unpacked\amp-native-host.js"$\r$\n'
  FileClose $0
  
  ; Register in Windows Registry for Chrome
  WriteRegStr HKCU "SOFTWARE\Google\Chrome\NativeMessagingHosts\com.ampiq.amp.native" "" "$INSTDIR\com.ampiq.amp.native.json"
  
  DetailPrint "Native messaging host registered successfully"
!macroend
