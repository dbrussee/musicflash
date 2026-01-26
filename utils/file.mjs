import fs from "fs-extra"
// const path = require("path")

const getAllFilesInFolder = (folder) => {
    try {
        if (!fs.existsSync(folder)) {
            return []
        } else {
            const entries = fs.readdirSync(folder, { withFileTypes: true })
            return entries
        }
    } catch(err) {
        console.error("Error reading directories from " + folder + ":", err)
        return []
    }
}
const isDirectory = (path) => {
    let isDir = false
    try {
        if (!path || path == "") {
            isDir = false
        } else {
            isDir = fs.statSync(path).isDirectory()
        }
    } catch(e) {
        isDir = false
    }
    return isDir
}

const bfile = {
    getAllFilesFrom: (folder) => {
        return getAllFilesInFolder(folder)
    },
    getDirectoriesFrom: (folder) => {
        const entries = getAllFilesInFolder(folder)
        return entries.filter(entry => {
            return entry.isDirectory()
        })
    },
    getMP3sFrom: (folder) => {
        const entries = getAllFilesInFolder(folder)
        return entries.filter(entry => {
            if (entry.isDirectory()) return false
            return entry.name.toUpperCase().endsWith(".MP3")
        })
    },
    isDirectory: (path) => {
        return isDirectory(path)
    },
    delete: (path) => {
        fs.removeSync(path)
    },
    copyFile: (from, tofolder, tofilename) => {
        fs.ensureDirSync(tofolder)
        if (fs.existsSync(tofolder + "/" + tofilename)) {
            return false
        } else {
            fs.copySync(from, tofolder + "/" + tofilename)
            return true
        }
    },
    folderExists: (path) => {
        return fs.existsSync(path)
    }
}


export default bfile
