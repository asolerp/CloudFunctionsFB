const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios')
const NOTIFICATIONS = require('./constants/Notifications')
const arr_diff = require('./utils/Arrays')

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
      const oldValue = change.before.data()
      const promises = []

      const playerChanged = arr_diff(oldValue.participation, newValue.participation)

      if (playerChanged[0] !== undefined) {
        console.log("Player has update the participation to false...")        
        const player = oldValue.players.find(p => p.uid === playerChanged[0])
        
        if (oldValue.participation[playerChanged[0]]) {
          console.log("Player is going to be removed from the team...")     
          const newTeam = oldValue[player.team]
          const newPlayers = oldValue.players
          const indexPlayer = oldValue.players.findIndex(p => p.uid === playerChanged[0])

          console.log("[[PLAYER]]", newPlayers[indexPlayer])

          // newPlayers[indexPlayer].dragged = false
          // delete newPlayers[indexPlayer].team
          // delete newPlayers[indexPlayer].line
          // delete newPlayers[indexPlayer].position

          newTeam[player.line][player.position] = {
            imgProfile: 'https://cdn4.iconfinder.com/data/icons/game-10/22/player-profile-512.png',
            name: 'Pmanager'
          }
          promises.push(db.collection('matches').doc(context.params.matchID).update({
            [player.team]: newTeam,
            players: newPlayers
          }))
        }
      }

      let assistance = 0
      Object.keys(newValue.participation).forEach(uid => {
        if (newValue.participation[uid]) {
          assistance += 1
        }
      })

      promises.push(db.collection('matches').doc(context.params.matchID).update({
        assistance: assistance
      }))

      return Promise.all(promises)
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

            let oldUser = change.before.data();
            let newUser = change.after.data();
  
            const matchesCollectionRef = db.collection('matches');
            const matchQuery = matchesCollectionRef.where('playersUID', 'array-contains', `${userId}`);

            return matchQuery.get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        return null;
                    } else {
                        let batch = db.batch();
                        querySnapshot.forEach(doc => {

                          // Update admin profile
                          if (doc.data().admins.find(p => p.uid === userId)) {

                            batch.update(doc.ref, {
                              admins: admin.firestore.FieldValue.arrayRemove({
                                imgProfile: oldUser.imgProfile,
                                uid: userId
                              })
                            })                                                
                            batch.update(doc.ref, {
                              admins: admin.firestore.FieldValue.arrayUnion({
                                imgProfile: newUser.imgProfile,
                                uid: userId
                              })
                            })
                          }

                          const oldPlayerData = doc.data().players.find(p => p.uid === userId)

                          // Update teams inside match

                          // if (oldPlayerData.line) {
                          //   batch.update(doc.ref, {
                          //     [`${oldPlayerData.line}.${oldPlayerData.position}`]: admin.firestore.FieldValue.arrayRemove(oldPlayerData)
                          //   }) 
                          //   batch.update(doc.ref, {
                          //     [`${oldPlayerData.line}.${oldPlayerData.position}`]: admin.firestore.FieldValue.arrayUnion({                              
                          //       assistance: false,
                          //       expoToken: newUser.expoToken || oldPlayerData.expoToken,
                          //       dragged: oldPlayerData.dragged,
                          //       imgProfile: newUser.imgProfile,
                          //       name: newUser.name,
                          //       line: oldPlayerData.line,
                          //       position: oldPlayerData.position,
                          //       principalPosition: newUser.principalPosition || oldPlayerData.principalPosition,
                          //       stats: newUser.stats,
                          //       uid: userId
                          //     })
                          //   }) 
                          // }

                          // Update player profile inside match
                          batch.update(doc.ref, {
                            players: admin.firestore.FieldValue.arrayRemove(oldPlayerData)
                          })                                                
                          batch.update(doc.ref, {
                            players: admin.firestore.FieldValue.arrayUnion({                              
                              assistance: false,
                              expoToken: newUser.expoToken || oldPlayerData.expoToken,
                              dragged: oldPlayerData.dragged,
                              imgProfile: newUser.imgProfile,
                              name: newUser.name,
                              principalPosition: newUser.principalPosition || oldPlayerData.principalPosition,
                              stats: newUser.stats,
                              uid: userId
                            })
                          })              

                          })                          
                        
          
                        return batch.commit();

                    }
                });
  
    });
