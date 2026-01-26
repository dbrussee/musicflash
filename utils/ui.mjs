import { isWorker } from "node:cluster";
import process from "node:process"
import promptSync from 'prompt-sync';
const prompt = promptSync();
const TITLE = " / ♪♪♪ { Music Flash Drive v1 } ♪♪♪ \\"
const BAR = "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"

function ESC(chars) {
    return "\x1B[" + chars
}
function ESCText(before, text, after) {
    return ESC(before) + text + ESC(after)
}
function sysout(txt) {
    process.stdout.write(txt)
}
hideCursor: () => {
    sysout(ESC("?25l"))
}
showCursor: () => {
    sysout(ESC("?25h"))
}

const savePosition = ESC("s")
const restorePosition = ESC("u")
const clearEOL = ESC("K")

const lines = {
    HEADING: { pos: 0, prefix: TITLE, value: ''},
    HEADING_BAR: {pos:1, prefix: BAR, value: ''},
    ARTIST: { pos: 2, prefix: " Artist:", value: '' }, // Current artist
    SONG: { pos: 3, prefix: "   Song:", value: '' }, // Current Song
    ACTION: { pos: 4, prefix: " Action:", value: '' }, // Current activity
    SPLIT: { pos: 5, prefix: BAR, value: ''},
    TITLES: { pos: 6, prefix: "         Artists  Songs  Path", value: ''},
    SOURCE: { pos: 7, prefix: " Source:", value: '' }, // Path to Source
    TARGET: { pos: 8, prefix: " Target:", value: '' }, // Path to Target
}
const countsText = (artistCount, songCount, isWorking) => {
    let aText = rjust(artistCount + "", 6)
    let sText = rjust(songCount + "", 7)
    if (isWorking) {
        aText = ui.gold(aText)
        sText = ui.gold(sText)
    } else {
        aText = ui.green(aText)
        sText = ui.green(sText)
    }
    return aText + sText
}
const rjust = (txt, available_width) => {
    while (txt.length < available_width) {
        txt = " " + txt
    }
    return txt
}
const goto = (row, col, text) => {
    // Save cursor pos and move to specified row / column
    sysout(moveto(row, col))
    if (text != undefined) sysout(text + clearEOL)
    sysout(restorePosition + clearEOL) // Clear EOL and restore cursor
}
const moveto = (row, col) => {
    return "\x1b[" + (row+1) + ";" + (col+1) + "H"
}
const updateDisplayLine = (line) => {
    goto(line.pos, line.prefix.length + 1, line.value)
}
function promptAndGetResult(question) {
    // goto(6, 0, text + " ")
    sysout(restorePosition)
    let answer = prompt("\r" + clearEOL + question)
    
    if (answer == null) {
        answer = "Ctl-C"
    } else {
        // answer = answer.replace("\n", "")
    }
    return answer

}

const ui = {
    initialize: () => {
        console.clear()
        Object.keys(lines).forEach((key) => {
            const line = lines[key]
            console.log(line.prefix)
        })
        // console.log("")
        sysout(savePosition)
        // console.log() // Room for prompt line
    },
    plural: (count, singular, plural) => {
        if (count == 1) {
            return "One " + singular
        } else if (count == 0) {
            return "No " + (plural ? plural : singular + "s")
        } else {
            return count + " " + (plural ? plural : singular + "s")
        }
    },
    wrapup: () => {
        ui.updateName("ARTIST", "", "SONG", "", "ACTION", ui.green("Done"))
        sysout(restorePosition)
        console.log()
    },
    updateSourceDisplay: (artistCount, songCount, isWorking, path) => {
        const counts = countsText(artistCount, songCount, isWorking)
        goto(lines.SOURCE.pos, lines.SOURCE.prefix.length + 2, counts + "  " + path)
    },
    updateTargetDisplay: (artistCount, songCount, isWorking, path) => {
        const counts = countsText(artistCount, songCount, isWorking)
        goto(lines.TARGET.pos, lines.TARGET.prefix.length + 2, counts + "  " + path)
    },
    updateName: (...args) => {
        for (let i = 0; i < args.length; i+=2) {
            const line = lines[args[i]]
            line.value = args[i+1]
            updateDisplayLine(line)        
        }
    },
    showLine: (line) => {
        updateDisplayLine(line)
    },
    show: (linecode) => {
        updateDisplayLine(lines[linecode])
    },
    write: (text) => {
        sysout(text)
    },
    promptUser: (text) => {
        return promptAndGetResult(text)
    },
    gold: (txt) =>{
        return ESCText("0;33m", txt, "0m")
    },
    green: (txt) => {
        return ESCText("0;32m", txt, "0m")
    },
    red: (txt) => {
        return ESCText("0;31m", txt, "0m")
    },
    blue: (txt) => {
        return ESCText("0;34m", txt, "0m")
    }

}

export default ui