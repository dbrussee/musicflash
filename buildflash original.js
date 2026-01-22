const fs = require("fs-extra")
const process = require("process")
const path = require("path")
const { log } = require("console")
const prompt = require('prompt-sync')() // <- MUST have that last ()

let ROOT = "" // /Volumes/Media/Music/
let TARGET = "" // /Volumes/MUSIC/
const ARTISTS_ORDER = []
const ARTISTS = {}
let SONGCOUNT = 0
const USE_NUMERIC_ORDER_CODE = false // Add '000 ' codes in copied files
const BAR = "=================================================="

const uiLines = {    
    HEADING: { line: 0, prefix: centerInBar("Music Flash Drive v1") },
    SOURCE: { line: 1, prefix: "Source: " }, // Path to Source
    TARGET: { line: 2, prefix: "Target: " }, // Path to Target
    ARTIST: { line: 3, prefix: "Artist: " }, // Current artist
    SONG: { line: 4, prefix: "Song: " }, // Current Song
    ACTION: { line: 5, prefix: "Action: " }, // Current activity
}
// Which line of the block are we on.
// When starting, we are on line 0. Once the main block is
// created, we will be on line 5
let curline = uiLines.HEADING.line

function main() {
    setCommandLineOptions()
    let ok = true
    if (ROOT == "") {
        ok = false
        console.error("No Source of MP3 files given")
    } else {
        if (!fs.existsSync(ROOT)) {
            ok = false
            console.error("Source location not found")
        }
    }
    if (TARGET == "") {
        ok = false
        console.error("No Target drive given")
    } else {
        if (!fs.existsSync(TARGET)) {
            ok = false
            console.error("Target location not found")
        }
    }
    if (!ok) return

    console.log(uiLines.HEADING.prefix)
    console.log(uiLines.SOURCE.prefix + green(ROOT))
    console.log(uiLines.TARGET.prefix + green(TARGET))
    console.log(uiLines.ARTIST.prefix)
    console.log(uiLines.SONG.prefix)
    console.log(uiLines.ACTION.prefix)
    // Currently on PROMPT line
    curline = 6

    SONGCOUNT = collectFromSource()
    logLine(uiLines.SOURCE, green(ROOT) + ": " + ARTISTS_ORDER.length + " Artists, " + SONGCOUNT + " Songs")
    let targetSongCount = collectFromTarget()
    logLine(uiLines.TARGET, green(TARGET) + ": " + targetSongCount + " Songs")

    doPrompt()

}
function doPrompt() {

    let runcode =  promptForOkTorun()
    if (runcode == "Y") {
        curline = 6
        const count = run()
        logLine(uiLines.TARGET, green(TARGET) + ": " + count)
        logLine(uiLines.ACTION, green("Finished"))
        console.log()
    } else if (runcode == "P") {
        curline = 6
        purgeDataFromRootFolder(0, TARGET)
        logLine(uiLines.TARGET, green(TARGET) + ": 0 Songs")
        doPrompt()
    } else {
            // if (!ok) console.log("You entered: '" + (answer != null ? answer : "Ctl-C") + "':")

        console.log("You entered " + gold(runcode) + ": " + red("Aborted"))
    }
}

main()

function run() {

    sortArtistsAndSongs()

    logLine(uiLines.ACTION, gold("Copying songs to " + TARGET))
    const count = writeSongsToFlashDrive(SONGCOUNT)

    logLine(uiLines.ARTIST)
    logLine(uiLines.SONG)

    return count
}

// === Utility MP3 methods
function collectFromSource() {
    logLine(uiLines.ACTION, gold("Reading files from source..."))
    let count = 0
    const folders = getDirectoriesInRoot(ROOT)
    folders.forEach((folder) => {
        const dir = folder.name
        if (!ARTISTS[dir]) {
            ARTISTS_ORDER.push(dir)
            ARTISTS[dir] = {files:[], folder:dir} // Collection of files
        }
        const artist = ARTISTS[dir]
        const files = getFilesInSourceFolder(dir)
        files.forEach((item) => {
            if (!item.name.startsWith('.')) {
                logLine(uiLines.SOURCE, green(ROOT) + ": " + gold(ARTISTS_ORDER.length) + " Artists, " + gold(count) + " Songs")
                logLine(uiLines.ARTIST, dir)
                logLine(uiLines.SONG, item.name)
                count++
                artist.files.push({
                    source: dir + "/" + item.name,
                    folder:dir, 
                    filename:item.name
                })
            }
        })
    })
    return count
}
function collectFromTarget() {
    logLine(uiLines.ACTION, gold("Reading files from target..."))
    let count = 0
    const letters = getDirectoriesInRoot(TARGET)
    letters.forEach((letter) => {
        const artists = getDirectoriesInRoot(TARGET + "/" + letter.name)
        artists.forEach((artist) => {
            const files = getFilesInTargetFolder(letter.name, artist.name)
            files.forEach(item => {
                if (!item.name.startsWith('.')) {
                    count++
                    logLine(uiLines.TARGET, green(TARGET) + ": " + gold(count) + " Songs")
                    logLine(uiLines.ARTIST, artist.name)
                    logLine(uiLines.SONG, item.name)
                }

            })
        })
    })
    return count
}

function sortArtistsAndSongs() {
    ARTISTS_ORDER.sort()
    ARTISTS_ORDER.forEach((dir) => {
        const artist = ARTISTS[dir]
        let first = artist.folder.substring(0,1).toUpperCase()
        if ("ABCDEFGHIJ<LMNOPQRSTUVWXYZ".indexOf(first) < 0) first = "#"
        artist.files.sort((a,b) => {
            return a.title < b.title
        })
    })
    return 0
}

function purgeDataFromRootFolder(count, path, folder) {
    // path guaranteed to NOT end with a slash
    logLine(uiLines.ACTION, gold("Purging " + count))
    const root = path + (folder ? "/" + folder : "")
    const entries = fs.readdirSync(root + "/", { withFileTypes: true })
    entries.forEach((entry) => {
        if (!entry.name.startsWith(".")) {
            if (entry.isDirectory()) {
                count = purgeDataFromRootFolder(count, root, entry.name)
                fs.removeSync(root + "/" + entry.name)
            } else {
                count++
                fs.removeSync(root + "/" + entry.name)
                logLine(uiLines.ACTION, gold("Purging " + count))
                logLine(uiLines.ARTIST, folder)
                logLine(uiLines.SONG, entry.name)
            }
        }
    })
    return count
}
function writeSongsToFlashDrive(masterCount) {
    let progress = 0
    let copied = 0
    ARTISTS_ORDER.forEach((dir, artist_index) => {
        const artist = ARTISTS[dir]
        const letter = artist.folder.substring(0,1)
        let code = letter
        if (artist_index < 100) code += "0"
        if (artist_index < 10) code += "0"
        code += artist_index
        artist.files.forEach((file, file_index) => {
            progress++
            const status = "Copying " + progress + " of " + SONGCOUNT + ' songs: ' + ((progress / SONGCOUNT) * 100).toFixed(2) + "%"
            logLine(uiLines.ARTIST, artist.folder)
            logLine(uiLines.SONG, file.filename)
            logLine(uiLines.ACTION, status)

            if (!fs.existsSync(TARGET + "/" + letter)) {
                fs.ensureDirSync(TARGET + "/" + letter)
            }
            let code = ""
            if (USE_NUMERIC_ORDER_CODE) {
                code = file_index + ""
                while (code.length < 3) { code = "0" + code}
                code += " "
            }
            const outfile = TARGET + "/" + letter + "/" + artist.folder + "/" + code + file.filename
            if (!fs.existsSync(TARGET + "/" + letter + "/" + artist.folder)) {
                fs.ensureDirSync(TARGET + "/" + letter + "/" + artist.folder)
            }
            if (!fs.existsSync(outfile)) {
                fs.copySync(ROOT + "/" + file.source, outfile)
                copied++
            }            
        })
    })

    return copied
}

// === File System methods
function getDirectoriesInRoot(location) {
    try {
        const entries = fs.readdirSync(location, { withFileTypes: true })
        const dirs = entries
            .filter(entry => entry.isDirectory())
        return dirs
    } catch(err) {
        console.error("Error reading directories:", err)
        return []
    }
}
function getFilesInSourceFolder(folder) {
    try {
        const entries = fs.readdirSync(ROOT + "/" + folder, { withFileTypes: true })
        const files = entries
            .filter(entry => !entry.isDirectory())
        return files
    } catch(err) {
        console.error("Error reading directories:", err)
        return []
    }
}
function getFilesInTargetFolder(letter, folder) {
    try {
        const entries = fs.readdirSync(TARGET + "/" + letter + "/" + folder, { withFileTypes: true })
        const files = entries
            .filter(entry => !entry.isDirectory())
        return files
    } catch(err) {
        console.error("Error reading directories:", err)
        return []
    }
}

// === UI methods
// Each line has a prefix, and then text. This method will
// move to the line specified, add the prefix for that line
// and then the text supplied... and clear the rest of the line
function logLine(uiLineItem, text) {
    const line_number = uiLineItem.line
    if (line_number < curline) process.stdout.write("\r\x1b[" + (curline - line_number) + "A")
    if (line_number > curline) process.stdout.write("\r\x1b[" + (line_number - curline) + "B")
    curline = line_number
    process.stdout.write("\r" + uiLineItem.prefix + (text ? text : '') + "\x1B[K ")
}
function gold(txt) {
    return "\x1b[1;33m" + txt + "\x1b[0m"
}
function green(txt) {
    return "\x1b[1;32m" + txt + "\x1b[0m"
}
function red(txt) {
    return "\x1b[1;31m" + txt + "\x1b[0m"
}
function centerInBar(txt) {
    if (!txt) return BAR
    const full_width = BAR.length
    const txt_width = txt.length + 4 // space before and after
    let half = Math.floor((full_width - txt_width) / 2)
    let left = BAR.substring(0, half)
    let right = left
    if ((half + half + txt_width) < full_width) {
        // Not exactly half
        right += "="
    }
    return left + "| " + txt + " |" + right
}

function setCommandLineOptions() {
    ROOT = process.argv.length > 2 ? process.argv[2] : ""
    TARGET = process.argv.length > 3 ? process.argv[3] : ""
    if (ROOT != "" && ROOT.endsWith("/")) ROOT = ROOT.substring(0,ROOT.length-1)
    if (TARGET != "" && TARGET.endsWith("/")) TARGET = TARGET.substring(0,TARGET.length-1)
    if (process.argv.length < 4) {
        console.log("Usage: ")
        console.log("node", path.basename(__filename), "<source>", "<target>")
    }
}
function promptForOkTorun() {
    logLine(uiLines.ARTIST)
    logLine(uiLines.SONG)
    logLine(uiLines.ACTION)
    const text = "\rType Y (to add missing), P (to Purge target) or any other to Quit... to continue: "
    let answer = prompt(text)
    let check = answer
    if (!answer) {
        answer = "Ctl-C"
        check = "Ctl-C"
    } else {
        check = answer.trim().toUpperCase().substring(0,1)
    }
    if (check == "Y") {
        answer = "Y"
    } else if (check == "P") {
        answer = "P"
    }
    return answer
}