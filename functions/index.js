const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();


exports.addMatchToUsers = functions.firestore
    .document('matches/{matchID}')
    .onCreate((snap, context) => {
      const promises = []
      const { players } = snap.data()
      players.forEach(p => {
        promises.push(
          db.doc(`users/${p.uid}/matches/${context.params.matchID}`).set({
            assistance: false
          }).then(() => console.log(`Partido añadido correctamente al judgador ${p.uid}`))
        )
      })
     return Promise.all(promises)
    });

exports.updateParticipation = functions.firestore
    .document('matches/{matchID}')
    .onUpdate((change, context) => {
      const newValue = change.after.data();
      let assistance = 0
      Object.keys(newValue.participation).forEach(uid => {
        if (newValue.participation[uid]) {
          assistance += 1
        }
      })
      const promise = db.collection('matches').doc(context.matchID).update({
        assistance: assistance
      }).then(() => console.log(`Participación actualizada`))
      return Promise.all(promise)
    });