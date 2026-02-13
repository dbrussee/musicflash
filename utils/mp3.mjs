import id3 from 'node-id3'

const mp3 = {
    parse: (filepath) => {
        return id3.read(filepath)
    },
    save: (tags, filepath) => {
        return id3.update(tags, filepath)
    }
}

export default mp3

