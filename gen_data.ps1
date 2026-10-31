$rooms = [ordered]@{}
$mediaExt = @(".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm")

function Sort-Natural {
    param($items)
    $items | Sort-Object {
        $basename = [System.IO.Path]::GetFileNameWithoutExtension($_)
        $num = 0
        if ([int]::TryParse($basename, [ref]$num)) {
            return $num
        } else {
            return $basename
        }
    }
}

Get-ChildItem -Directory "Rooms" | Sort-Object Name | ForEach-Object {
    $rName = $_.Name
    $rPath = $_.FullName
    
    $infoFile = Join-Path $rPath "info.txt"
    $rInfo = ""
    if (Test-Path $infoFile) {
        $raw = Get-Content $infoFile -Raw -Encoding utf8 -ErrorAction SilentlyContinue
        if ($raw) { $rInfo = $raw.Trim() }
    }
    
    $directFiles = Get-ChildItem -File $rPath | Where-Object { 
        $ext = $_.Extension.ToLower()
        $mediaExt -contains $ext -and $_.Name -ne "thumbnail.jpg"
    } | Select-Object -ExpandProperty Name
    
    $directMedia = @()
    if ($directFiles) {
        $sorted = Sort-Natural $directFiles
        $directMedia = $sorted | ForEach-Object { "Rooms/$rName/$_" }
    }
    
    $directThumb = ""
    $thumbFile = Join-Path $rPath "thumbnail.jpg"
    if (Test-Path $thumbFile) {
        $directThumb = "Rooms/$rName/thumbnail.jpg"
    } elseif ($directMedia.Count -gt 0) {
        $directThumb = $directMedia[0]
    }
    
    $subfolders = @()
    Get-ChildItem -Directory $rPath | Sort-Object Name | ForEach-Object {
        $subName = $_.Name
        $subFullPath = $_.FullName
        
        $subInfoFile = Join-Path $subFullPath "info.txt"
        $subInfo = ""
        if (Test-Path $subInfoFile) {
            $subRaw = Get-Content $subInfoFile -Raw -Encoding utf8 -ErrorAction SilentlyContinue
            if ($subRaw) { $subInfo = $subRaw.Trim() }
        }
        
        $subFiles = Get-ChildItem -File $subFullPath | Where-Object {
            $ext = $_.Extension.ToLower()
            $mediaExt -contains $ext -and $_.Name -ne "thumbnail.jpg"
        } | Select-Object -ExpandProperty Name
        
        $subMedia = @()
        if ($subFiles) {
            $sortedSub = Sort-Natural $subFiles
            $subMedia = $sortedSub | ForEach-Object { "Rooms/$rName/$subName/$_" }
        }
        
        $subThumb = ""
        $subThumbFile = Join-Path $subFullPath "thumbnail.jpg"
        if (Test-Path $subThumbFile) {
            $subThumb = "Rooms/$rName/$subName/thumbnail.jpg"
        } elseif ($subMedia.Count -gt 0) {
            $subThumb = $subMedia[0]
        }
        
        $subfolders += @{
            name = $subName
            info = $subInfo
            thumbnail = $subThumb
            photos = $subMedia
        }
    }
    
    # Special handling for room 123
    if ($rName -eq "123 (Design Laboratory, Heat and Mass Transfer Laboratory)" -and $subfolders.Count -eq 0) {
        $subfolders += @{
            name = "Point C [stair case near Mech Dept]"
            info = "beside Mechanical HOD cabin"
            thumbnail = "Rooms/123 (Design Laboratory, Heat and Mass Transfer Laboratory)/Access Point: Point C [stair case near Mech Dept]/thumbnail.jpg"
            photos = @()
        }
    }
    
    $floor = "Other"
    $dept = ""
    if ($rName -match "^B" -or $rName -match "Basement|Machine Shop|Foundry|Fluid Mechanics") {
        $floor = "Basement & Ground"
        if ($rName -match "Machine|Foundry|Fluid") { $dept = "Mechanical Eng." }
    } elseif ($rName -match "^1") {
        $floor = "1st Floor"
        if ($rName -match "Design|Heat") { $dept = "Mechanical Eng." }
    } elseif ($rName -match "^2") {
        $floor = "2nd Floor"
        if ($rName -match "PE lab") { $dept = "Power Electronics" }
        elseif ($rName -match "DSP lab") { $dept = "Signal Processing" }
        elseif ($rName -match "20[5-8]") { $dept = "CSE / ISE" }
    } elseif ($rName -match "^3") {
        $floor = "3rd Floor"
    } elseif ($rName -match "^4") {
        $floor = "4th Floor"
    } elseif ($rName -match "^5") {
        $floor = "5th Floor"
    } elseif ($rName -match "^M-") {
        $floor = "Mechanical Block"
        $dept = "Mechanical Eng."
    } elseif ($rName -match "Auditorium") {
        $floor = "Campus Amenities"
        $dept = "Main Hall"
    } elseif ($rName -match "CSBS") {
        $floor = "Computer Science"
        $dept = "CSBS Dept"
    }

    $college = "Engineering"
    if ($rName -match "MBA" -or $rInfo -match "MBA" -or $rPath -match "MBA") {
        $college = "MBA"
    }

    $rooms[$rName] = @{
        name = $rName
        college = $college
        floor = $floor
        dept = $dept
        info = $rInfo
        thumbnail = $directThumb
        photos = $directMedia
        accessPoints = $subfolders
    }
}

$json = $rooms | ConvertTo-Json -Depth 6
$json | Out-File "rooms_data.json" -Encoding utf8
"window.LOCOROM_DATA = " + $json + ";" | Out-File "rooms_data.js" -Encoding utf8
Write-Output "Successfully updated rooms_data.json and rooms_data.js with sorted order!"
