const fs = require("fs-extra")
const process = require("process")
const path = require("path")
const { log } = require("console")
// const prompt = require('inquirer') // <- MUST have that last ()
const prompt = require('prompt-sync')() // <- MUST have that last ()

let SOURCE = "" // /Volumes/Media/Music/
let TARGET = "" // /Volumes/MUSIC/
let ISSUE = "" // Global UI issue
const ARTISTS_ORDER = []
const ARTISTS = {}
let SOURCECOUNT = -1
let TARGETCOUNT = -1
const USE_NUMERIC_ORDER_CODE = false // Add '000 ' codes in copied files

const ui = {    
    initialized: false,
    lines: {
        HEADING: { prefix: "-=♩♪♬| Music Flash Drive v1 |♬♪♩=-", value: ''},
        SOURCE: { prefix: " Source:", value: '' }, // Path to Source
        TARGET: { prefix: " Target:", value: '' }, // Path to Target
        ARTIST: { prefix: " Artist:", value: '' }, // Current artist
        SONG: { prefix: "   Song:", value: '' }, // Current Song
        ACTION: { prefix: " Action:", value: '' }, // Current activity
    },
    draw: (item, value) => {
        if (!ui.initialized) {
            console.log(ui.lines.HEADING.prefix)
            console.log(ui.lines.SOURCE.prefix)
            console.log(ui.lines.TARGET.prefix)
            console.log(ui.lines.ARTIST.prefix)
            console.log(ui.lines.SONG.prefix)
            console.log(ui.lines.ACTION.prefix)
            ui.initialized = true
        } else {
            process.stdout.write(ui.up(7))
            process.stdout.write(ui.lineText(ui.lines.SOURCE))
            process.stdout.write(ui.lineText(ui.lines.TARGET))
            process.stdout.write(ui.lineText(ui.lines.ARTIST))
            process.stdout.write(ui.lineText(ui.lines.SONG))
            process.stdout.write(ui.lineText(ui.lines.ACTION))
            process.stdout.write(ui.down(1))
        }
        // process.stdout.write("\r\x1b[1B")
    },
    clean: () => {
        ui.lines.ARTIST.value = ""
        ui.lines.SONG.value = ""
        ui.lines.ACTION.value = ""
        ui.draw()
    },
    lineText: (itm) => {
        let txt = ui.down(1)
        txt += itm.prefix
        txt += (itm.value == "" ? "" : " " + itm.value)
        txt += ui.clearEOL()
        return txt
    },
    plural: (count, text) => {
        if (count < 1) return ui.gold("No") + " " + text + "s"
        if (count == 1) return ui.gold(count) + " " + text
        return ui.gold(count) + " " + text + "s"
    },
    save: () => {
        process.stdout.write("\x1b[s")
        return ""
    },
    restore: () => {
        process.stdout.write("\x1b[u")
        return ""
    },
    down: (number_of_lines) => {
        return "\r\x1b[" + number_of_lines + "B"
    },
    up: (number_of_lines) => {
        return "\r\x1b[" + number_of_lines + "A"
    },
    clearEOL: () => {
        return "\x1B[K"
    },
    gold: (txt) =>{
        return "\x1b[1;33m" + txt + "\x1b[0m"
    },
    green: (txt) => {
        return "\x1b[1;32m" + txt + "\x1b[0m"
    },
    red: (txt) => {
        return "\x1b[1;31m" + txt + "\x1b[0m"
    }

}
function promptUser(text) {
    let answer = prompt(text.trim() + " " + ui.clearEOL())
    // let answer = prompt("\r" + text.trim() + "\x1B[K ")
    if (answer == null) answer = "Ctl-C"
    return answer
}

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


function collectFromTarget() {
    ui.lines.ACTION.value = ui.gold("Reading files from target...")
    ui.lines.TARGET.value = ui.green(TARGET) + ": " + ui.plural(TARGETCOUNT, "song")
    ui.draw()
    TARGETCOUNT = 0
    const letters = getDirectoriesInRoot(TARGET)
    letters.forEach((letter) => {
        const artists = getDirectoriesInRoot(TARGET + "/" + letter.name)
        artists.forEach((artist) => {
            const files = getFilesInTargetFolder(letter.name, artist.name)
            files.forEach(item => {
                if (!item.name.startsWith('.')) {
                    TARGETCOUNT++
                    ui.lines.TARGET.value = ui.green(TARGET) + ": " + ui.plural(TARGETCOUNT, "song")
                    ui.lines.ARTIST.value = artist.name
                    ui.lines.SONG.value = item.name
                    ui.draw()
                }
            })
        })
    })
}

function collectFromSource() {
    ui.lines.ACTION.value = ui.gold("Reading files from source...")
    ui.draw()
    SOURCECOUNT = 0
    const folders = getDirectoriesInRoot(SOURCE)
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
                SOURCECOUNT++
                ui.lines.SOURCE.value = ui.green(SOURCE) + ": " + ui.plural(ARTISTS_ORDER.length, "artist") + ", " + ui.plural(SOURCECOUNT, "song")
                ui.lines.ARTIST.value = dir
                ui.lines.SONG.value = item.name
                ui.draw()
                artist.files.push({
                    source: dir + "/" + item.name,
                    folder:dir, 
                    filename:item.name
                })
            }
        })
    })
}
function getFilesInSourceFolder(folder) {
    try {
        const entries = fs.readdirSync(SOURCE + "/" + folder, { withFileTypes: true })
        const files = entries
            .filter(entry => !entry.isDirectory())
        return files
    } catch(err) {
        console.error("Error reading directories:", err)
        return []
    }
}
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

function purgeDataFromRootFolder(count, path, folder) {
    // path guaranteed to NOT end with a slash
    ui.lines.ACTION.value = ui.gold("Purging " + count)
    ui.draw()
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
                TARGETCOUNT--
                ui.lines.TARGET.value = ui.green(TARGET) + ": " + ui.plural(TARGETCOUNT, "song")
                ui.lines.ACTION.value = ui.gold("Purging " + count)
                ui.lines.ARTIST.value = folder
                ui.lines.SONG.value = entry.name
                ui.draw()
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
            const status = ui.gold("Copying ") + ui.green(progress) + " of " + ui.gold(SOURCECOUNT) + ' songs' + ': ' + ui.green(((progress / SOURCECOUNT) * 100).toFixed(2) + "%")
            ui.lines.ARTIST.value = artist.folder
            ui.lines.SONG.value = file.filename
            ui.lines.ACTION.value = status
            ui.draw()

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
                fs.copySync(SOURCE + "/" + file.source, outfile)
                TARGETCOUNT++
                ui.lines.TARGET.value = ui.green(TARGET) + ": " + ui.plural(TARGETCOUNT, "song")
                copied++
            }            
        })
    })

    return copied
}



function main() {
    console.clear()
    ui.draw()
    setCommandLineOptions()
    let count = 0
    ok = true
    if (SOURCE != '') collectFromSource()
    if (TARGET != '') collectFromTarget() 
    ui.clean()   
    while(ok) {
        if (ISSUE != "") {
            ui.lines.ACTION.value = ui.red(ISSUE)
        }
        ISSUE = ""
        ui.draw()
        ui.lines.ACTION.value = ""
        let text = "What do you want to do?"
        const answer = promptUser(text)
        const upper = answer.trim().toUpperCase()
        if (upper == "") {
            ui.clean()
        } else if (upper == "?") {
            ui.lines.ACTION.value = ui.gold("Enter [Run,Source,SetSource,Target,SetTarget,Purge,Quit]")
            ui.draw()
        } else if (upper == "T" || upper == "RT") {
            if (TARGET == '') {
                ISSUE = "No Target set (use ST <path>)"
            } else {
                collectFromTarget()
                ui.clean()
            }
        } else if (upper == "S" || upper == "RS") {
            if (SOURCE == '') {
                ISSUE = "No Source set (use SS <path>"
            } else {
                collectFromSource()
                ui.clean()
            }
        } else if (upper == "P" || upper == "PURGE") {
            if (TARGET == '') {
                ISSUE = "No Target set (use ST <path>)"
            } else {
                if (TARGETCOUNT == -1) collectFromTarget()
                purgeDataFromRootFolder(0, TARGET)
                collectFromTarget()
                ui.clean()
            }
        } else if (upper == "R" || upper == "GO" || upper == "W") {
            if (TARGET == '') {
                ISSUE = "No Target set (use ST <path>)"
            } else if (SOURCE == '') {
                ISSUE = "No Source set (use SS <path>)"
            } else {
                if (SOURCECOUNT == -1) {
                    collectFromSource()
                }
                writeSongsToFlashDrive(0)
                collectFromTarget()
                ui.clean()
            }
        } else if (upper.startsWith("SS ")) {
            const parts = answer.replace("  ", " ").split(" ")
            let test = ""
            if (parts.length > 1) {
                test = parts[1]
                if (test != "" && test.endsWith("/")) test = test.substring(0,test.length-1)
            }
            let isDir = isDirectory(test, "Usage: SS <path>")
            if (isDir) {
                SOURCE = test
                ARTISTS = {}
                ARTISTS_ORDER = []
                SOURCECOUNT = -1
                ui.lines.SOURCE.value = ui.green(SOURCE)
                ui.draw()
                collectFromSource()
                ui.clean()
            }
        } else if (upper.startsWith("ST ")) {
            const parts = answer.replace("  ", " ").split(" ")
            let test = ""
            if (parts.length > 1) {
                test = parts[1]
                if (test != "" && test.endsWith("/")) test = test.substring(0,test.length-1)
            }
            let isDir = isDirectory(test, "Usage: ST <path>")
            if (isDir) {
                TARGET = test
                TARGETCOUNT = -1
                ui.lines.TARGET.value = ui.green(TARGET)
                ui.draw()
                collectFromTarget()
                ui.clean()
            }
        }
        ok = (upper != "CTL-C" && !upper.startsWith("Q"))
    }
}

function setCommandLineOptions() {
    SOURCE = process.argv.length > 2 ? process.argv[2] : ""
    TARGET = process.argv.length > 3 ? process.argv[3] : ""
    if (SOURCE != "" && SOURCE.endsWith("/")) SOURCE = SOURCE.substring(0,SOURCE.length-1)
    if (SOURCE != "" && !isDirectory(SOURCE, "Invalid Source: " + SOURCE)) SOURCE = ""
    if (SOURCE != "") ui.lines.SOURCE.value = ui.green(SOURCE)

    if (TARGET != "" && TARGET.endsWith("/")) TARGET = TARGET.substring(0,TARGET.length-1)
    if (TARGET != "" && !isDirectory(TARGET, "Invalid Target: " + TARGET)) TARGET = ""
    if (TARGET != "") ui.lines.TARGET.value = ui.green(TARGET)
}

function isDirectory(path, issueIfNotDir) {
    let isDir = false
    try {
        if (!path || path == "") {
            isDir = false
        } else {
            isDir = fs.statSync(path).isDirectory()
        }
        if (!isDir) ISSUE = issueIfNotDir ? issueIfNotDir : ""
    } catch(e) {
        ISSUE = "Error: " + path
        isDir = false
    }
    return isDir
}

main()