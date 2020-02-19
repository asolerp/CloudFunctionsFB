const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios')

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
      return db.collection('matches').doc(context.params.matchID).update({
        assistance: assistance
      })
      .then(() => console.log(`Participación actualizada`))
      .catch(e => console.log(e))
    });


    //send the push notification 
exports.sendPushNotification = functions.firestore
    .document('matches/{matchID}').onUpdate((change, context) => {

    const newValue = change.after.data();
    let players = []
    let messages = []
  //return the main promise 

  const config = {
    headers: { 
      'Content-Type': 'application/json', 
      'accept-encoding': 'gzip, deflate',   
      'host': 'exp.host'  
    }
  }

  players.push(axios({
      method: 'post',
      url: 'https://exp.host/--/api/v2/push/send',
      headers: { 
        'Content-Type': 'application/json', 
        'accept-encoding': 'gzip, deflate',   
        'host': 'exp.host'  
      }, 
      data: {
        "to": "ExponentPushToken[rzZvAvIkzHFXoOnqWwLChF]",
        "title": "Hola!!!",
        "tag": "main-tag",
        "body": "Te veo desde Cloud!!!!!!!"
      }      
    })
    .then(response => console.log(response.data))
    .catch(err => console.log(err))
  )

  return Promise.all(players)
  
  // axios.post('https://api.ipify.org?format=json')

  // players.push(
  //   fetch('https://exp.host/--/api/v2/push/send', {       
  //        method: 'POST', 
  //        headers: {
  //              Accept: 'application/json',  
  //             'Content-Type': 'application/json', 
  //             'accept-encoding': 'gzip, deflate',   
  //             'host': 'exp.host'      
  //         }, 
  //       body: JSON.stringify({                 
  //             to: 'ExponentPushToken[rzZvAvIkzHFXoOnqWwLChF]',                        
  //             title: 'New Notification',                  
  //             body: 'The notification worked!',             
  //             priority: "high",            
  //             sound:"default",              
  //             channelId:"default",   
  //           }),        
  //         })
  // )

  // Object.keys(newValue.participation).forEach(async uid => {
  //   players.push(db.collection('users')
  //   .doc(uid)
  //   .get()
  //   .then(doc => {
  //     let expoToken = doc.data().expoToken;
  //     if (expoToken) {
  //       messages.push(fetch('https://exp.host/--/api/v2/push/send', {       
  //        method: 'POST', 
  //        headers: {
  //              Accept: 'application/json',  
  //             'Content-Type': 'application/json', 
  //             'accept-encoding': 'gzip, deflate',   
  //             'host': 'exp.host'      
  //         }, 
  //       body: JSON.stringify({                 
  //             to: expoToken,                        
  //             title: 'New Notification',                  
  //             body: 'The notification worked!',             
  //             priority: "high",            
  //             sound:"default",              
  //             channelId:"default",   
  //           }),        
  //         })
  //       );
  //     }
  //     return Promise.all(messages)
  //   })
  //   )
  // })

});