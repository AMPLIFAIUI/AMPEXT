# FTP Upload Script for AMP Website
$ftpHost = 'ftp://ftpupload.net'
$username = 'if0_40573652'
$password = 'RDd9j8pJx14qQKc'
$localPath = 'E:\AMPEXT NOV 2025\AMPEXT\website'
$remotePath = '/htdocs'

# Create FTP request function
function Upload-FTPFile {
    param($localFile, $remoteFile)
    
    $uri = New-Object System.Uri("$ftpHost$remoteFile")
    $ftp = [System.Net.FtpWebRequest]::Create($uri)
    $ftp.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $ftp.Credentials = New-Object System.Net.NetworkCredential($username, $password)
    $ftp.UseBinary = $true
    $ftp.UsePassive = $true
    
    $content = [System.IO.File]::ReadAllBytes($localFile)
    $ftp.ContentLength = $content.Length
    
    $stream = $ftp.GetRequestStream()
    $stream.Write($content, 0, $content.Length)
    $stream.Close()
    
    $response = $ftp.GetResponse()
    Write-Host "Uploaded: $localFile -> $remoteFile"
    $response.Close()
}

function Create-FTPDirectory {
    param($remoteDir)
    
    try {
        $uri = New-Object System.Uri("$ftpHost$remoteDir")
        $ftp = [System.Net.FtpWebRequest]::Create($uri)
        $ftp.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftp.Credentials = New-Object System.Net.NetworkCredential($username, $password)
        $ftp.UsePassive = $true
        
        $response = $ftp.GetResponse()
        Write-Host "Created directory: $remoteDir"
        $response.Close()
    } catch {
        # Directory might already exist
    }
}

Write-Host 'Starting FTP upload to amp.infinityfreeapp.com...'
Write-Host ''

# Create directories
Create-FTPDirectory "$remotePath/assets"
Create-FTPDirectory "$remotePath/downloads"

# Upload HTML files
Get-ChildItem -Path $localPath -Filter '*.html' | ForEach-Object {
    Upload-FTPFile $_.FullName "$remotePath/$($_.Name)"
}

# Upload assets
Get-ChildItem -Path "$localPath\assets" | ForEach-Object {
    Upload-FTPFile $_.FullName "$remotePath/assets/$($_.Name)"
}

Write-Host ''
Write-Host 'FTP upload complete!'
Write-Host 'Website: https://amp.infinityfreeapp.com'

