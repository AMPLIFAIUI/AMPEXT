# FTP Upload Script for AMPiQ website
$ftpServer = "ftpupload.net"
$username = "if0_39585107"
$password = "Ouijaboards38"
$localFolder = "E:\AMPEXT NOV 2025\AMPEXT\website\ampiq"
$remoteFolder = "/htdocs"

# Create credentials
$ftpCreds = New-Object System.Net.NetworkCredential($username, $password)

# Function to upload a file
function Upload-FtpFile {
    param($localFile, $remotePath)
    
    $uri = "ftp://$ftpServer$remotePath"
    Write-Host "Uploading: $localFile -> $uri"
    
    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create($uri)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.Credentials = $ftpCreds
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        
        $fileContent = [System.IO.File]::ReadAllBytes($localFile)
        $ftpRequest.ContentLength = $fileContent.Length
        
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $ftpRequest.GetResponse()
        Write-Host "  SUCCESS: $($response.StatusDescription)" -ForegroundColor Green
        $response.Close()
        return $true
    }
    catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create remote directory
function Create-FtpDirectory {
    param($remotePath)
    
    $uri = "ftp://$ftpServer$remotePath"
    Write-Host "Creating directory: $uri"
    
    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create($uri)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftpRequest.Credentials = $ftpCreds
        $ftpRequest.UsePassive = $true
        
        $response = $ftpRequest.GetResponse()
        Write-Host "  Directory created" -ForegroundColor Green
        $response.Close()
    }
    catch {
        Write-Host "  Directory may already exist: $_" -ForegroundColor Yellow
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Uploading AMPiQ website to ampiq.info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create assets directory
Create-FtpDirectory "$remoteFolder/assets"

# Upload index.html
Upload-FtpFile "$localFolder\index.html" "$remoteFolder/index.html"

# Upload assets
$assetsFolder = "$localFolder\assets"
if (Test-Path $assetsFolder) {
    Get-ChildItem $assetsFolder -File | ForEach-Object {
        Upload-FtpFile $_.FullName "$remoteFolder/assets/$($_.Name)"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Upload complete!" -ForegroundColor Green
Write-Host "Visit: https://ampiq.info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

