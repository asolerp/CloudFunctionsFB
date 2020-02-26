const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios')
const NOTIFICATIONS = require('./constants/Notifications')

admin.initializeApp();
const db = admin.firestore();

const sendNotif = (messages) => {
  return axios({
    method: 'post',
    url: 'https://exp.host/--/api/v2/push/send',
    headers: { 
      'Content-Type': 'application/json', 
      'accept-encoding': 'gzip, deflate',   
      'host': 'exp.host'  
    }, 
    data: messages      
  })
  .then(response => console.log(response.data))
  .catch(err => console.log(err))
}


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
      return db.collection('matches').doc(context.params.matchID).update({
        assistance: assistance
      })
      .then(() => console.log(`Participación actualizada`))
      .catch(e => console.log(e))
    });


// NOTIFICATIONS 

exports.newMatch = functions.firestore
  .document('matches/{matchID}')
  .onCreate((snap, context) => {

    const newValue = snap.data();
    const { NEW_MATCH } = NOTIFICATIONS
    let messages = []
    newValue.players.forEach(player => {
      messages.push({
        "to": player.expoToken,
        "title": NEW_MATCH.title,
        "body": NEW_MATCH.message
      })
    })

    return sendNotif(messages)

})

exports.sendPushNotification = functions.https.onRequest( async (req, res) => {

  const { from, matchUID, senderUID, notification } = req.body

  const doc = await db.collection('matches').doc(matchUID).get()
  const messages = []

  doc.data().players.forEach(player => {
    if (player.uid !== senderUID ) {
      messages.push({
        "to": player.expoToken,
        "title": notification.title,
        "body": `${from} ${notification.message}`
      })
    }
  })

  return sendNotif(messages)

});


// UPDATE PROFILE 

exports.updateProfileUsername = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
        const { userId } = context.params;

            let newUser = change.after.data();
  
            const matchesCollectionRef = db.collection('matches');
            const matchQuery = matchesCollectionRef.where('playersUID', 'array-contains', `${userId}`);

            return matchQuery.get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        return null;
                    } else {
                        // let batch = db.batch();
                        console.log("[[MATCHES]]")
                        querySnapshot.forEach(doc => {
                            console.log(doc.data())
                            // batch.update(doc.ref, { username: `${newUsername}` });
                        });
                        return
                        // return batch.commit();

                    }
                });
  
    });