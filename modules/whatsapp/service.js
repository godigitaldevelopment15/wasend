const {MessageMedia, Location} = require('whatsapp-web.js');
//##################################################//
//                    Functions                        //
//##################################################//
function convertTochatId(mobile){
    if(mobile.includes("@c.us")){
      return mobile
    }
    if( isNaN(parseInt(mobile[0])) ){
      chatId = mobile.slice(1) +  "@c.us";
    }else{
        chatId = mobile + "@c.us";
    }
    return chatId
  }
async function checkUser(client,chatId){
    const validClient= await client.isRegisteredUser(chatId)
    console.log("validClient");
    console.log(validClient);
    if(!validClient){
      console.log('not one')
      throw "Not a registered User"
      
    }
    return chatId
  }
  async function sendMessage(client,chatId,message){ 
    const recipient= await checkUser(client,chatId)
    const msg= await client.sendMessage(recipient, message)
    return msg
  }
  async function sendMedia(client,chatId,urltoMedia,caption){
    const recipient= await checkUser(client,chatId)
    const media = await MessageMedia.fromUrl('https://via.placeholder.com/350x150.png');
    const msg= await client.sendMessage(recipient,media,{caption});
    return msg
  }
  async function sendLocation(client,chatId,lat,long,desc){
    console.log("sendLocation(",chatId,lat,long,desc,")");
    const recipient= await checkUser(client,chatId)
    const location= new Location(lat, long, desc)
    const msg= await client.sendMessage(recipient,location);
    return msg
  }

  async function createGroup(client,title, participants=[]){
    let b=await client.getContactById(convertTochatId(participants[0]))
    const group=await client.createGroup(title,[convertTochatId(participants[0])])
    return group
  }
  async function getCommonGroups(client,mobile){
    const contactId= convertTochatId(mobile)
    const contact= await client.getContactById(contactId)
    if(!contact) throw 'Contact does not exist'
    const commongroups= await client.getCommonGroups(contact.id._serialized)
    return commongroups
}
module.exports={sendMessage,sendMedia, sendLocation, createGroup, getCommonGroups, convertTochatId, checkUser}