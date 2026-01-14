const fs = require("fs-extra")
const process = require("process")
const path = require("path")
const prompt = require('prompt-sync')() // <- MUST have that last ()
// const { execSync } = require('child_process')

let ROOT = "" // /Volumes/Media/Music/
let TARGET = "" // /Volumes/MUSIC/
const ARTISTS_ORDER = []
const ARTISTS = {}
const BAR = "=================================================="


let stepCount = 0
let stepNumber = 1
let totalSteps = 4

const options = {
    purge: true
}

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

    console.log(centerInBar("Music Flash Drive"))
    console.log(" * Source:", green(ROOT))
    console.log(" * Target", green(TARGET))
    console.log(" * Purge drive before build:", 
        options.purge ? red("Yes - Existing files on Target will be deleted") : gold("No - Only new files will be added"))
    if (promptForOkTorun()) {
        console.clear()
        console.log(centerInBar("Music Flash Drive"))

        run()
    } else {
        console.log(red("Aborted"))
    }
}

main()

function run() {
    console.log("Step number and description")
    console.log(BAR)
    console.log("Artist:")
    console.log(" Title:")
    print("\x1b[1A Title:")

    logSomething(stepText() + gold("Purging " + TARGET))
    if (options.purge) {
        stepCount = purgeDataFromRoot(0, TARGET)
        logStepFinish(stepText() + green("Purged " + stepCount + " files from " + TARGET))
    } else {
        logStepFinish(stepText() + gold("No Purge (nopurge found as command argument)"))
    }

    stepNumber++
    logSomething(stepText() + gold("Reading source data from " + ROOT))
    let masterCount = collectFromSource()
    logStepFinish(stepText() + green("Found " + masterCount + " files on " + ROOT))

    stepNumber++
    logSomething(stepText() + gold("Sorting"))
    stepCount = sortArtistsAndSongs()
    logStepFinish(stepText() + green("Files sorted"))

    // stepNumber++
    // logSomething(stepText() + gold("Cleaning unreferenced files"))
    // stepCount = purgeUnusedFromFlashDrive()
    // logStepFinish(stepText() + green("Cleaned " + stepCount + " files"))

    stepNumber++
    logSomething(stepText() + gold("Copying songs to " + TARGET))
    stepCount = writeSongsToFlashDrive(masterCount)
    let postCount = postActionCleanup(TARGET)
    logSomething(null, "", ARTISTS_ORDER.length + " Artists", stepCount + " Songs copied to " + TARGET)
    logStepFinish(stepText() + green("Copied " + stepCount + " files" + (postCount == 0 ? "" : " & Cleaned up " + postCount)))

    console.log(centerInBar("Done"))

}

// === Utility MP3 methods
function collectFromSource() {
    let count = 0
    const folders = getDirectoriesInRoot()
    folders.forEach((folder) => {
        const dir = folder.name
        if (!ARTISTS[dir]) {
            ARTISTS_ORDER.push(dir)
            ARTISTS[dir] = {files:[], folder:dir} // Collection of files
        }
        const artist = ARTISTS[dir]
        const files = getFilesInFolder(dir)
        files.forEach((item) => {
            if (!item.name.startsWith('.')) {
                logSomething(null, count + " files", dir, item.name)
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

function purgeDataFromRoot(count, path, folder) {
    // path guaranteed to NOT end with a slash
    const root = path + (folder ? "/" + folder : "")
    const entries = fs.readdirSync(root + "/", { withFileTypes: true })
    entries.forEach((entry) => {
        if (!entry.name.startsWith(".")) {
            if (entry.isDirectory()) {
                count = purgeDataFromRoot(count, root, entry.name)
                fs.removeSync(root + "/" + entry.name)
            } else {
                count++
                fs.removeSync(root + "/" + entry.name)
                logSomething(null, count + " files", folder, entry.name)
            }
        }
    })
    return count
}
function postActionCleanup(path, folder) {
    let count = 0
    const root = path + (folder ? "/" + folder : "")
    const entries = fs.readdirSync(root, { withFileTypes: true })
    entries.forEach((entry) => {
        if (entry.name.startsWith(".") && (folder)) {
            if (entry.isDirectory()) {
                count += postActionCleanup(root, entry.name)
                fs.removeSync(root + "/" + entry.name)
            } else {
                logSomething(null, "", folder, entry.name + " DELETE")
                count++
                fs.removeSync(root + "/" + entry.name)
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
            const status = progress + " of " + masterCount + ' : ' + ((progress / masterCount) * 100).toFixed(2) + "%"
            logSomething(null, status, artist.folder, file.filename)
            if (!fs.existsSync(TARGET + "/" + letter)) {
                fs.ensureDirSync(TARGET + "/" + letter)
            }
            let code = file_index + ""
            while (code.length < 3) { code = "0" + code}
            const outfile = TARGET + "/" + letter + "/" + artist.folder + "/" + code + " " + file.filename
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
function getDirectoriesInRoot() {
    try {
        const entries = fs.readdirSync(ROOT, { withFileTypes: true })
        const dirs = entries
            .filter(entry => entry.isDirectory())
        return dirs
    } catch(err) {
        console.error("Error reading directories:", err)
        return []
    }
}
function getFilesInFolder(folder) {
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

// === UI methods
function print(txt) {
    process.stdout.write("\r" + txt + "\x1B[K ");
}
function logSomething(action, progress, artist, title) {
    if (action == null) {
        print("\x1b[2A" + centerInBar(progress))
    } else {
        print("\x1b[3A" + action)
        print("\x1b[1B" + centerInBar(progress))
    }
    print("\x1b[1BArtist: " + (artist ? artist : ''))
    print("\x1b[1B Title: " + (title ? title : ''))
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
function logStepFinish(msg) {
    print("\x1b[3A" + msg)
    console.log("")
    // console.log("")
    console.log(BAR)
    console.log("Artist:")
    console.log(" Title:")
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

function stepText() {
    return "Step " + stepNumber + "/" + totalSteps + ": "
}

function setCommandLineOptions() {
    ROOT = process.argv.length > 2 ? process.argv[2] : ""
    TARGET = process.argv.length > 3 ? process.argv[3] : ""
    if (ROOT != "" && ROOT.endsWith("/")) ROOT = ROOT.substring(0,ROOT.length-1)
    if (TARGET != "" && TARGET.endsWith("/")) TARGET = TARGET.substring(0,TARGET.length-1)
    process.argv.forEach((arg, i) => {
        if (i > 3) { // first 2 are <node command> and <program name>
            test = arg.trim().toUpperCase()
            if (test == "NOPURGE" || test == "-NOPURGE") options.purge = false
        }
    })
    if (process.argv.length < 4) {
        console.log("Usage: ")
        console.log("node", path.basename(__filename), "<source>", "<target>", "[nopurge]")
    }
}
function promptForOkTorun() {
    let ok = false
    const text = "If this looks good, type Y and Enter to confirm: "
    const answer = prompt(text)
    ok = (answer && answer.length > 0 && answer.trim().toUpperCase().startsWith("Y"))
    if (!ok) print("You entered: '" + (answer != null ? answer : "Ctl-C") + "' -")
    return ok
}