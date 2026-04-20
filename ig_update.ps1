$dir = 'C:\Users\91996\.gemini\antigravity\scratch\eterno-fashion'
$files = Get-ChildItem "$dir\*" -Include '*.html','*.js'
foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $c = $c.Replace('https://www.instagram.com/eternofashion', 'https://www.instagram.com/eterno_fashionx?igsh=MWFkcW84eWdpcnNyaw==')
    $c = $c.Replace('@eternofashion', '@eterno_fashionx')
    [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($f.Name)"
}
Write-Host "Instagram link updated to @eterno_fashionx"
