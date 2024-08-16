#Usage:
#       Invoke-Expression (Get-Content .\install.ps1 -Raw)

#Environment variables config
[Environment]::SetEnvironmentVariable("Mp3DownTagger", """C:\Program Files\Mp3DownTagger""", "Machine")
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Mp3DownTagger", "Machine")

#config.json file permissions
$sharepath = "C:\Program Files\Mp3DownTagger\config.json"
$Acl = Get-ACL $SharePath
$AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users","Write","None","None","Allow")
$Acl.AddAccessRule($AccessRule)
Set-Acl $SharePath $Acl

#Symbolic link to config.json
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\Music\Mp3DownTagger\config.json" -Target "C:\Program Files\Mp3DownTagger\config.json"


