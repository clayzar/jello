export default function get(object, path = '') {
    return path.split('.')
        .reduce((o, x) => o == undefined ? o : o[x]
        , object)
}
