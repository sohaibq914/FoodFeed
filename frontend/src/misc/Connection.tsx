"use client";

export class API_Caller {
    private link: string = 'http://localhost:5001/'
    public call_function = async (command: string, body: string): Promise<{response: Response, data: any}> => {
        console.log("For command: " + command + ": sending " + body)
        const response = await fetch(this.link.concat(command), { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: body,
          });
          
        return await {response: response, data: await response.json()};
    }
};

export function get_caller(): API_Caller {
    return new API_Caller();
};
