import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

const getTrainsBetweenStations = (origin: string, destination: string): string[] => {
    // Mock data for demonstration purposes
    if (origin === "Delhi" && destination === "Mumbai") {
        return ["Rajdhani Express", "Duronto Express", "Garib Rath"];
    } else if (origin === "Mumbai" && destination === "Delhi") {
        return ["August Kranti Rajdhani", "Mumbai Rajdhani", "Paschim Express"];
    } else {
        return ["Premium Train 1", "Premium Train 2", "Premium Train 3"];
    }
};

const bookTicket = (train: string): string | 'UNAVAILABLE' => {

    // Mock booking logic

    if (train === "Rajdhani Express") {
        return "PNR1234567890";
    } else {
        return 'UNAVAILABLE';

    }
};

const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
        role: "system",
        content: "You are a helpful assistant that helps users find trains between stations and book tickets."
    },
];

const callopenAIWithFunctions = async () => {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: history,
        temperature: 0,
        tools: [
            {
                type: "function",
                function: {
                    name: "getTrainsBetweenStations",
                    parameters: {
                        type: "object",
                        properties: {
                            origin: {
                                type: "string",
                                description: "Origin Station"
                            },
                            destination: {
                                type: "string",
                                description: "destination Station"
                            },
                        },

                        required: ["origin", "destination"]

                    },
                },

            },
            {
                type: "function",
                function: {
                    name: "bookTicket",
                    parameters: {
                        type: "object",
                        properties: {
                            train: {
                                type: "string",
                                description: "Train name"
                            },

                        },

                        required: ["train"]

                    },
                },
            }


        ],

        tool_choice: "auto"
    });

    const shouldInvokeFunction = response.choices[0]?.finish_reason === "tool_calls"

    const toolCall = response.choices[0]?.message.tool_calls?.[0]

    

    if (!shouldInvokeFunction && !toolCall) {
        console.log(response.choices[0]?.message.content);
        history.push(response.choices[0]?.message!);
        return;
    }



        const functionName = toolCall.function.name

        if (functionName === "getTrainsBetweenStations") {
            const rawArgs = toolCall.function.arguments;

            const parsedArgs = JSON.parse(rawArgs);

            const trains = getTrainsBetweenStations(parsedArgs.origin, parsedArgs.destination)

            if (response.choices[0]?.message) {
                history.push(response.choices[0].message);
            }
            history.push({
                role: "tool",
                content: trains.toString(),
                tool_call_id: toolCall.id
            });
        }


        if (functionName === "bookTicket") {
            const rawArgs = toolCall.function.arguments;

            const parsedArgs = JSON.parse(rawArgs);

            const ticket = bookTicket(parsedArgs.train)

            if (response.choices[0]?.message) {
                history.push(response.choices[0].message);
            } history.push({
                role: "tool",
                content: ticket,
                tool_call_id: toolCall.id
            });
        }

        //call openAI with function calling response
        const finalResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: history,
            temperature: 0,
        });

        console.log(finalResponse.choices[0]?.message.content);



    
}

process.stdin.addListener("data", async (data) => {
    const userInput = data.toString().trim();
    history.push({
        role: "user",
        content: userInput,
    });
    await callopenAIWithFunctions();
}); 