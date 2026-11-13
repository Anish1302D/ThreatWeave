$tmpDir = "C:\Users\Admin\AppData\Local\Google\Chrome\User Data Debug"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$targetFile = "C:\Users\Admin\AppData\Local\Google\Chrome\User Data\DevToolsActivePort"

$proc = Start-Process -FilePath $chromePath -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$tmpDir",
    "--no-first-run",
    "--no-default-browser-check",
    "http://localhost:5173/command-center"
) -PassThru

# Wait for CDP to respond
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $ver = (Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 2).Content | ConvertFrom-Json
        if ($ver.webSocketDebuggerUrl) {
            $path = $ver.webSocketDebuggerUrl -replace '^ws://[^/]+', ''
            Set-Content -Path $targetFile -Value @("9222", $path) -Encoding ascii
            Write-Host "DevToolsActivePort ready at port 9222 ($path)"
            break
        }
    } catch {}
}

# Keep the daemon process alive as long as Chrome is running
$proc.WaitForExit()

