import bfile from "./utils/file.mjs"
import ui from './utils/ui.mjs'
import mp3 from "./utils/mp3.mjs"

let SOURCE = "" // /Volumes/Media/Music/
let SOURCECOUNT = -1
const SOURCE_ARTISTS_ORDER = []
let SOURCE_ARTISTS = {}

let AFTER_OBJECT = null

let TARGET = "" // /Volumes/MUSIC/
let TARGETCOUNT = -1
let TARGET_ARTISTCOUNT = 0

let ABORT_REQUESTED = false

// The "code" is the first letter of the artist
// plus a number of digits for incremental values
// The number of digits is based on the multiplier
// 100 leaves 2 digits... 1000 would leave 3 digits
// Keep this as small as possible.
const CODE_MULTIPLIER = 100 // Code = 

function main() {
    ui.initialize()
    setCommandLineOptions()
    if (SOURCE != '') doCollectFromSource()
    if (TARGET != '') doCollectFromTarget()
    let answer = ""
    let reprompt = true
    doHelp()
    while(reprompt) {
        answer = ui.promptUser("Your wish is my command: ")
        reprompt = doAction(answer)
    }
    ui.wrapup()
    if (AFTER_OBJECT != null) {
        console.log(AFTER_OBJECT)
    }
}
main()

function setCommandLineOptions() {
    SOURCE = process.argv.length > 2 ? process.argv[2] : ""
    TARGET = process.argv.length > 3 ? process.argv[3] : ""
    if (SOURCE != "" && SOURCE.endsWith("/")) SOURCE = SOURCE.substring(0,SOURCE.length-1)
    if (SOURCE == '') SOURCE = "/Users/dan/code/fakemusic"
    if (SOURCE != "" && !bfile.isDirectory(SOURCE)) {
        ui.updateSourceDisplay("", "", false, ui.red("Invalid: '" + SOURCE + "'"))
        SOURCE = ""
    } else {
        ui.updateSourceDisplay("", "", false, ui.green(SOURCE))
    }

    if (TARGET != "" && TARGET.endsWith("/")) TARGET = TARGET.substring(0,TARGET.length-1)
    if (TARGET == '') TARGET = "/Users/dan/code/fakeflash"
    if (TARGET != "" && !bfile.isDirectory(TARGET)) {
        ui.updateTargetDisplay("", '', false, ui.red("Invalid: '" + TARGET + "'"))
        TARGET = ""
    } else {
        ui.updateTargetDisplay("", '', false, ui.green(TARGET))
    }
}

// ============ Action Methods
function doAction(action) {
    try {
        const upper = action.trim().toUpperCase()
        if (action == "Ctl-C") return false
        else if (upper == "Q" || upper == "X") return false
        else if (upper == "S") doCollectFromSource()
        else if (upper == "T") doCollectFromTarget()
        else if (upper == "P") doPurgeTarget()
        else if (upper == "B") doWriteSongsToFlashDrive("")
        else if (upper == "BT") doWriteSongsToFlashDrive("TOYOTA")
        else if (upper == "D") { doDebug(); return false }
        else doHelp(action)
        return true
    } catch(err) {
        ui.updateName("ACTION", "Error: " + ui.red(err) + " " + err.stack.split("\n")[1].trim())
    }
}

function doDebug() {
    ui.updateName("ARTIST", "| Debugging output...")
    const meta = mp3.parse("/Volumes/Media/Music/ACDC/TNT.mp3")
    AFTER_OBJECT = meta
    ui.updateName("ACTION", "| " + meta.artist)
}

function doNothing() {
    ui.updateName("ACTION", "")
}
function doHelp() {
    ui.updateName("ARTIST", "| " + ui.blue("P (Purge all songs from Target drive"))
    ui.updateName("SONG", "| " + ui.blue("B or BT (Build (for Toyota) from Source songs)"))
    ui.updateName("ACTION", "| " + ui.blue("Q or Ctl-C (Quit)"))
}
function doInvalid(action) {
    ui.updateName("ACTION", ui.red("??? '" + action + "'") + ui.gold(" (Enter ? for Help)"))
}
function doCollectFromTarget() {
    if (TARGET == '') {
        ui.updateName("ARTIST","| ", "SONG","| ")
        ui.updateName("ACTION", "| " + ui.red("Target not valid"))
        return
    }
    ui.updateName("ACTION", ui.gold("Reading files from target..."))
    ui.updateTargetDisplay("", "", true, ui.green(TARGET))
    TARGETCOUNT = 0
    TARGET_ARTISTCOUNT = 0
    const letters = bfile.getDirectoriesFrom(TARGET)
    letters.forEach((letter) => {
        const artists = bfile.getDirectoriesFrom(TARGET + "/" + letter.name)
        artists.forEach((artist) => {
            TARGET_ARTISTCOUNT++
            const files = bfile.getMP3sFrom(TARGET + "/" + letter.name + "/" + artist.name)
            files.forEach(item => {
                if (ABORT_REQUESTED) return
                if (!item.name.startsWith('.')) {
                    TARGETCOUNT++
                    ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, true, ui.green(TARGET))
                    // ui.update("TARGET", ui.green(TARGET) + " (Artists: " + ui.gold(TARGET_ARTISTCOUNT) + ", Songs: " + ui.gold(TARGETCOUNT) + ")")
                    // ui.update("ARTIST", artist.name, "SONG", item.name)
                }
            })
        })
    })
    ui.updateName("ARTIST", "| Found " + ui.plural(TARGET_ARTISTCOUNT, "artist"))
    ui.updateName("SONG", "| Found " + ui.plural(TARGETCOUNT, "song"))
    ui.updateName("ACTION", "| " + ui.green("Finished reading target"))
    ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, false, ui.green(TARGET))
    // ui.update("TARGET", ui.green(TARGET) + " (Artists: " + ui.green(TARGET_ARTISTCOUNT) + ", Songs: " + ui.green(TARGETCOUNT) + ")")
}

function doCollectFromSource() {
    if (SOURCE == '') {
        ui.updateName("ARTIST","| ", "SONG","| ")
        ui.updateName("ACTION", "| " + ui.red("Source not valid"))
        return
    }
    ui.updateName("ACTION", ui.gold("Reading files from source..."))
    SOURCECOUNT = 0
    SOURCE_ARTISTS = {}
    SOURCE_ARTISTS_ORDER.length = 0
    const dirs = bfile.getDirectoriesFrom(SOURCE)
    dirs.forEach((dir) => {
        if (!SOURCE_ARTISTS[dir.name]) {
            SOURCE_ARTISTS_ORDER.push(dir.name)
            SOURCE_ARTISTS[dir.name] = {files:[], folder:dir.name} // Collection of files
        }
        const artist = SOURCE_ARTISTS[dir.name]
        const files = bfile.getMP3sFrom(SOURCE + "/" + dir.name)
        files.forEach((item) => {
            if (ABORT_REQUESTED) return
            if (!item.name.startsWith('.')) {
                SOURCECOUNT++
                ui.updateSourceDisplay(SOURCE_ARTISTS_ORDER.length, SOURCECOUNT, true, ui.green(SOURCE))
                artist.files.push({
                    source: dir.name + "/" + item.name,
                    folder: dir.name, 
                    filename: item.name
                })
            }
        })
    })
    SOURCE_ARTISTS_ORDER.sort((a,b) => {
        return a < b
    })
    ui.updateName("ARTIST", "| Found " + ui.plural(SOURCE_ARTISTS_ORDER.length, "artist"))
    ui.updateName("SONG", "| Found " + ui.plural(SOURCECOUNT, "song"))
    ui.updateName("ACTION", "| " + ui.green("Finished reading source"))
    ui.updateSourceDisplay(SOURCE_ARTISTS_ORDER.length, SOURCECOUNT, false, ui.green(SOURCE))
}
function doPurgeTarget() {
    if (TARGET == '') {
        ui.updateName("ARTIST","| ", "SONG","| ")
        ui.updateName("ACTION", "| " + ui.red("Target not valid"))
        return
    }
    let count = 0
    ui.updateName("ACTION", ui.gold("Purging " + count))
    const letters = bfile.getDirectoriesFrom(TARGET)
    letters.forEach((letter) => {
        const letterpath = TARGET + "/" + letter.name
        const artists = bfile.getDirectoriesFrom(letterpath)
        artists.forEach((artist) => {
            const artistpath = letterpath + "/" + artist.name
            const songs = bfile.getMP3sFrom(artistpath)
            songs.forEach((song) => {
                count++
                ui.updateName("ACTION", ui.gold("Purging " + count))
                ui.updateName("ARTIST", artist.name, "SONG", song.name)
                const songpath = artistpath + "/" + song.name
                bfile.delete(songpath)
                TARGETCOUNT--
                ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, true, ui.green(TARGET))
            })
            bfile.delete(artistpath)
            TARGET_ARTISTCOUNT--
            ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, true, ui.green(TARGET))

        })
        bfile.delete(letterpath)
    })
    ui.updateName("ARTIST", "| ", "SONG", "| Purged " + ui.plural(count, "song"), "ACTION", "| " + ui.green("Purge complete"))
    ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, false, ui.green(TARGET))
}
function doWriteSongsToFlashDrive(car) {
    if (TARGET == '' || SOURCE == '') {
        ui.updateName("ARTIST","| ", "SONG","| ", "ACTION","| ")
        if (SOURCE == '') {
            ui.updateName("SONG", "| " + ui.red("Source not valid"))
        }
        if (TARGET == '') {
            ui.updateName("ACTION", "| " + ui.red("Target not valid"))
        }
        return
    }
    let progress = 0
    let copied = 0
    let skipped = 0
    ui.updateName("ACTION", ui.gold("Preparing to build..."))
    let letter_count = 1
    let prior_letter = ""
    SOURCE_ARTISTS_ORDER.forEach((dir, artist_index) => {
        const artist = SOURCE_ARTISTS[dir]
        ui.updateName("ARTIST", ui.gold(artist.folder))
        const letter = artist.folder.substring(0,1)
        if (letter != prior_letter) {
            letter_count = 1
            prior_letter = letter
        }
        const order_code = (CODE_MULTIPLIER + letter_count++).toString().substring(1)
        // 001, 002, etc

        artist.files.forEach((file, file_index) => {
            const fromfile = SOURCE + "/" + file.source
            const tofolder = TARGET + "/" + letter + "/" + artist.folder
            const tofile = file.filename
            if (!bfile.folderExists(tofolder)) {
                TARGET_ARTISTCOUNT++
            }
            ui.updateName("SONG",ui.gold(file.filename))
            // const outfile = TARGET + "/" + letter + "/" + artist.folder + "/" + file.filename
            if (bfile.copyFile(fromfile, tofolder, tofile)) {
                if (car == "TOYOTA") {
                    const meta = mp3.parse(tofolder + "/" + tofile)
                    const tags = { title: letter + order_code + " " + meta.title }
                    mp3.save(tags, tofolder + "/" + tofile)
                }
                copied++
                TARGETCOUNT++
            } else {
                skipped++
            }
            progress++
            const status = ui.gold("Build progress: ")
                + (skipped == 0 ? "" : "Skipped " + ui.gold(skipped) + ", ")
                + "Copied " + ui.gold(copied)
                + " of "
                + ui.gold(SOURCECOUNT)
                + " songs: "
                + ui.green(((progress / SOURCECOUNT) * 100).toFixed(2)) + "%"
            ui.updateName("ACTION",status)
            ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, true, ui.green(TARGET))
            // ui.update("TARGET", ui.green(TARGET) + " (Artists: " + ui.gold(TARGET_ARTISTCOUNT) + ", Songs: " + ui.gold(TARGETCOUNT) + ")")
        })
    })
    ui.updateName("ARTIST", "| Processed " + ui.plural(SOURCE_ARTISTS_ORDER.length, "artist") + ', ' + ui.plural(SOURCECOUNT, "song"))
    ui.updateName("SONG", "| Copied " + ui.plural(copied, "song") + (skipped > 0 ? ", Skipped " + ui.plural(skipped, "song") : ""))
    ui.updateName("ACTION", "| " + ui.green("Finished copying from Source to Target"))
    ui.updateTargetDisplay(TARGET_ARTISTCOUNT, TARGETCOUNT, false, ui.green(TARGET))
}

