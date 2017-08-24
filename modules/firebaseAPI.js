import * as firebase from 'firebase';
import GeoFire from 'geofire'
import * as _ from 'lodash'
import Exponent from 'expo';

export const loginUser = (accessToken) => {
    const provider = firebase.auth.FacebookAuthProvider //declare fb provider
    const credential = provider.credential(accessToken) //generate fb credential

    return firebase.auth().signInWithCredential(credential) // signin to firebase using facebook credential
}

export const logoutUser = () => {
  return firebase.auth().signOut()
}

export const updateUser = (uid, key, value) => {
  firebase.database().ref().child('users').child(uid)
    .update({[key]:value})
}

export const mergeUser = (uid, token, newData) => {
  console.log('newData', newData)

  watchUserLocationDemo(uid)

  const firebaseRefAtUID = firebase.database().ref().child('users').child(uid)

  return firebaseRefAtUID.once("value").then((snap) => {
    const defaults = {
        maxDistance: 5,
        uid: uid,
        fbAuthToken: token,
        photoUrls: [],
        bio: '',
        emojis: '',
        interests: '',
    }
    const current = snap.val()
    const mergedUser = {...defaults, ...current, ...newData}

    firebaseRefAtUID.update(mergedUser)
  })  
}

export const getCurrentSchool = (id, token, func) => {
  fetch(`https://graph.facebook.com/${id}/education?access_token=${token}`)
    .then((response) => { 
        response.json().then((res) => { 
          console.log(res.data, id)
    })
  })
}

export const mergeUserPhotoUrls = (uid, urls) => {
  const firebaseRefAtUID = firebase.database().ref().child('users').child(uid)

  firebaseRefAtUID.update({photoUrls: urls})
}

export const getPhotoUrlsFromFbCb = (id, token, func) => { 
  fetch(`https://graph.facebook.com/${id}/albums?access_token=${token}`)
    .then((response) => { 
        response.json().then((res) => { 
          const album = res.data.filter((album) => {
            if(album.name == 'Profile Pictures')
              return album
          })

        if(album[0] != null)
          fetch(`https://graph.facebook.com/${album[0].id}/photos?access_token=${token}`)
            .then((response) => {
              response.json().then((res) => {
                func(res.data.map((photo) => {
                  return `https://graph.facebook.com/${photo.id}/picture?access_token=${token}`
                }))
              })
          })
        else
          func([])
    })
  })
}

export const getAllPhotoUrlsFromFbCb = (id, token, func) => { 
  fetch(`https://graph.facebook.com/${id}/albums?access_token=${token}`)
    .then((response) => { 
        response.json().then((res) => { 
          const album = res.data.filter((album) => {
            if(album.name == 'Mobile Uploads')
              return album
          })

        if(album[0] != null)
          fetch(`https://graph.facebook.com/${album[0].id}/photos?access_token=${token}`)
            .then((response) => {
              response.json().then((res) => {
                func(res.data.map((photo) => {
                  return `https://graph.facebook.com/${photo.id}/picture?access_token=${token}`
                }))
              })
          })
        else
          func([])
    })
  })
}
export const rejectProfileFromUser = (userKey, profileKey) => {
  const now = new Date();

  firebase.database().ref().child('users').child(userKey).child('rejections').update({[profileKey]:{date: now}})
  firebase.database().ref().child('users').child(profileKey).child('rejections').update({[userKey]:{date: now}})
}

export const getUser = (key) => {
  return firebase.database().ref().child('users').child(key).once('value')
    .then((snap) => snap.val())
}

export const getUserCb = (key, func) => {
  firebase.database().ref().child('users').child(key).once('value')
    .then((snap) => func(snap.val()))
}

export const getUsersCb = (keyArray, func) => {
  firebase.database().ref().child('users').once('value')
    .then((snap) => {
      if(snap.val() != null) {
        const users = []

        keyArray.forEach((key) => {
          users.push(snap.val()[key])
        })

        func(users)
      }
    })
}

export const getChat = (key) => {
  return firebase.database().ref().child('messages').child(key).once('value')
    .then((snap) => snap.val())
}

export const getChatCb = (key, func) => {
  return firebase.database().ref().child('messages').child(key).once('value')
    .then((snap) => { func(snap.val()) })
}

export const getChatsCb = (keyArray, func) => {
  firebase.database().ref().child('messages').once('value')
    .then((snap) => {
      if(snap.val() != null) {
        const chats = []

        keyArray.forEach((key) => {
          chats.push(snap.val()[key])
        })

        func(chats)
      }
    })
}

export const getChatMessageCountFromUid = (chatID, uid) => {
  firebase.database().ref().child('messages').child(key).once('value')
    .then((snap) => {
      const messageCount = Object.values(snap.val()).filter((message) => {
        return message.sender == uid
      }).length

      return messageCount
    })
}

export const getChatWithProfiles = (userKey, profileKey, func) => {
  //Sort uid concatenation in order of greatness so every user links to the same chat
  const uidArray = [userKey, profileKey]
  uidArray.sort()
  const chatID = uidArray[0]+'-'+uidArray[1]

  getChatCb(chatID, (chat) => { func(chat) })
}

export const getChatIDsWithProfilesAndUser = (userKey, profileKeyArray, func) => {
  const chatIDs = []

  profileKeyArray.forEach((profileKey) => {
    const uidArray = [userKey, profileKey]
    uidArray.sort()
    const chatID = uidArray[0]+'-'+uidArray[1]

    chatIDs.push(chatID)
  })

  func(chatIDs)
}

export const getProfilesInChatsWithKey = (key, func) => {
  return firebase.database().ref().child('messages').once('value')
    .then((snap) => {
    if(snap.val() != null) {
        const profileUids = []

        Object.keys(snap.val()).forEach((chatID) => {
          if(chatID.split('-').some((uid) => {return uid == key}))
            profileUids.push(chatID.split('-').filter((uid) => {return uid != key}))
        })

        getUsersCb(profileUids, (profiles) => {func(profiles)})
      }
    })
}

export const checkForChat = (userKey, profileKey, func) => {
  firebase.database().ref().child('messages').once('value')
    .then((snap) => {
      if(snap.val() != null) {
        let hasChat = false

        Object.keys(snap.val()).forEach((chatID) => {
          if(chatID.split('-').some((uid) => {return uid == userKey}) && chatID.split('-').some((uid) => {return uid == profileKey}))
            hasChat = true
        })

        func(hasChat)
      } 
  })
}

export const watchForNewChat = (userKey, profileKey, func) => {
  firebase.database().ref().child('messages').on('value', (snap) => {
      if(snap.val() != null) {
        let hasChat = false

        Object.keys(snap.val()).forEach((chatID) => {
          if(chatID.split('-').some((uid) => {return uid == userKey}) && chatID.split('-').some((uid) => {return uid == profileKey})){
            hasChat = true
          }
        })


        func(hasChat)
      } 
  })
}

export const watchChatForRecentMessage = (key, func) => {
  firebase.database().ref().child('message').child(key).on('value', (snap) => {
      if(snap.val() != null) {
        console.log('snapaf slkdjfalskdfjlkasjf')
        console.log(snap.val()[0])
        func(snap.val()[0])
      } 
  })
}

export const watchChatsWithProfilesInKey = (key, func) => {
  return firebase.database().ref().child('messages').on('value', (snap) => {
    if(snap.val() != null) {
        const profileUids = []

        Object.keys(snap.val()).forEach((chatID) => {
          if(chatID.split('-').some((uid) => {return uid == key}))
            profileUids.push(chatID.split('-').filter((uid) => {return uid != key}))
        })

        getUsersCb(profileUids, (profiles) => {func(profiles)})
      }
    })
}

export const turnOffChatListener = () => {
  return firebase.database().ref().child('messages').off()
}


export const getAllUsers = (func) => {
  firebase.database().ref().child('users').once('value')
    .then((snap) => {
      if(snap.val() != null) {
        if(snap.val() != null)
          getUsersCb(Object.keys(snap.val()), (profiles) => {
            if(profiles != null)
              func(profiles)
          })
        else
          func(null)
      }
    })
}

export const watchUser = (key, func) => {
  firebase.database().ref().child('users/'+key).on('value', (snap) => {
    func(snap.val())
  })
}

export const removeWatchUser = (key) => {
  firebase.database().ref().child('users/'+key).off()
}

export const watchForNewProfiles = (user, func) => {
  const firebaseRef = firebase.database().ref()
  const geoFire = new GeoFire(firebaseRef.child('geoData/'))

  geoFire.get(user.uid).then(location => {    
    const geoQuery = geoFire.query({
      center: location,
      radius: 3000 //user.maxDistance
    })

    geoQuery.on("ready", (res) => { // loaded geodata
      geoQuery.cancel()
    })

    geoQuery.on("key_entered", (key, location, distance) => {
      // console.log(key + " entered query at " + location + " (" + distance + " km from center)");
      getUser(key).then((entry) => {
        if(entry != null) {
          func(entry)
        }   
      })
     
    }) 
  }) 
}

export const getDistanceFromUser = (profileKey, userKey, func) => {
  const firebaseRef = firebase.database().ref()
  const geoFire = new GeoFire(firebaseRef.child('geoData/'))

  geoFire.get(profileKey).then((profileLocation) => {
    geoFire.get(userKey).then((userLocation) => {
      const distanceFromUser = GeoFire.distance(userLocation, profileLocation)
      func(distanceFromUser)
    })
  })
}

export const watchUserLocation = (key) => {
  const firebaseRef = firebase.database().ref()
  const geoFire = new GeoFire(firebaseRef.child('geoData/'))
  const options ={
    enableHighAccuracy:false,
    timeInterval:100000,
    distanceInterval: 3000
  }
  Exponent.Location.watchPositionAsync(options,(pos)=>{
    const {latitude,longitude} = pos.coords
    geoFire.set(key, [latitude,longitude]).then(() => {
        // console.log("Key has been added to GeoFire");
      }, (error) => {
        // console.log("Error: " + error);
      })
  })
}
export const watchUserLocationDemo = (key) => {
  const firebaseRef = firebase.database().ref()
  const geoFire = new GeoFire(firebaseRef.child('geoData/'))
  const lat = -26.2041028
  const lon = 28.0473051
  geoFire.set(key, [lat, lon]).then(() => {
      // console.log("Key has been added to GeoFire");
    }, (error) => {
      // console.log("Error: " + error);
    })
}