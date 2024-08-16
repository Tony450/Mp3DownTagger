#Usage:
#       Invoke-Expression (Get-Content .\update.ps1 -Raw)

#config.json file permissions
$sharepath = "C:\Program Files\Mp3DownTagger\config.json"
$Acl = Get-ACL $SharePath
$AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users","Write","None","None","Allow")
$Acl.AddAccessRule($AccessRule)
Set-Acl $SharePath $Acl