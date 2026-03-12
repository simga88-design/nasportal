Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\pcserver\pcserver\start_server.bat" & Chr(34), 0
Set WshShell = Nothing
