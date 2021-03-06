const https = require('https');


/*
 * Node.js does not have a simple built-in to use API for sending HTTPS POST requests
 * Code adapted from https://stackoverflow.com/a/67094088/3105260
 */
async function post(url, data, headers) {
    console.log("Sending a post request with data: ", JSON.stringify(data, null, 2))
    
    const dataString = JSON.stringify(data);

    headers['Content-Length'] = dataString.length;

    const options = {
        method: 'POST',
        headers: headers,
        timeout: 10000, // in ms
    };

    console.log("options for posst request: ", JSON.stringify(options, null, 2));

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            const body = [];
            res.on('data', (chunk) => {
                body.push(chunk);
            });
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                if (res.statusCode < 200 || res.statusCode > 299) {
                    reject(new Error(`POST code=${res.statusCode} body: ${resString}`));
                } else {
                    resolve(resString);
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request time out'));
        });
        req.write(dataString);
        req.end();
    });
}


exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    if(event.version && event.version != '2.0') {
        console.log(`[!!] WARNING: event.version ('${event.version}') different `
            + `from expected '2.0' - if something breaks it's propably because of this`);
    }
    
    const httpMethod = event.httpMethod || event.requestContext.http.method;

    if(httpMethod == 'POST') {
        const postResponse = await post(
            `https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/pr-to-development.yml/dispatches`,
            {
                ref: "development"
            },
            { 
                'Content-Type': 'application/vnd.github.v3+json',
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'User-Agent': 'curl/7.79.1'
            }
        );

        console.log(`Response from post: ${postResponse}`);

        return {
            statusCode: 303,
            headers: {
                Location: `https://github.com/${process.env.GITHUB_REPO}/pulls`
            }
        };
    } else {
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
}

