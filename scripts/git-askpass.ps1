if ($args -contains 'Username') { Write-Output $env:GH_USER; exit 0 }
if ($args -contains 'Password') { Write-Output $env:GH_PASS; exit 0 }
exit 1