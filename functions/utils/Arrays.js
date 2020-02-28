const arr_diff  = (a1, a2) => {

    let a = [], diff = [];

    Object.keys(a1).forEach(key => {
        a[key] = a1[key]
    })

    Object.keys(a2).forEach(key => {
        if (a[key] === a2[key]) {
            delete a[key]
        } else {
            a[key] = a2[key]
        }
    })


    for (let k in a) {
        diff.push(k);
    }

    return diff;
}


module.exports = arr_diff