!macro customUnInit
  ; Kill all AMP processes before uninstalling
  DetailPrint "Terminating AMP processes..."
  
  ; Kill AMPiQ.exe
  nsExec::ExecToLog 'taskkill /f /im AMPiQ.exe'
  
  ; Kill electron.exe processes
  nsExec::ExecToLog 'taskkill /f /im electron.exe'
  
  ; Kill node.exe processes
  nsExec::ExecToLog 'taskkill /f /im node.exe'
  
  ; Wait for processes to terminate
  Sleep 2000
  
  ; Run cleanup script if it exists
  IfFileExists "$INSTDIR\cleanup.ps1" 0 +3
    DetailPrint "Running cleanup script..."
    nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\cleanup.ps1"'
  
  DetailPrint "Cleanup completed"
!macroend

!macro customInstall
  ; Copy cleanup script to installation directory if it exists
  IfFileExists "cleanup.ps1" 0 +2
    File "cleanup.ps1"
!macroend