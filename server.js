// Require modules
const { Pinecone } = require("@pinecone-database/pinecone");
const dotenv = require("dotenv");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { VectorDBQAChain } = require("langchain/chains");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { Document } = require("langchain/document");

dotenv.config();

const express = require('express');
const app = express();

app.use(express.json());

// Function to query the knowledgebase
async function queryKnowledgebase(query) {
    try {
        // Initialize Pinecone database
        const pinecone = new Pinecone();

        // Create a Pinecone index based on the environment variable
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

        // Initialize the vector store with OpenAI embeddings
        const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings(),
            { pineconeIndex }
        );

        // Initialize the chat model
        const model = new ChatOpenAI({
            temperature: 0.9,
        });

        // Create a chain for querying
        const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
            k: 6,
            returnSourceDocuments: true,
        });

        // Query the knowledgebase and retrieve the response
        const response = await chain.call({ query });
        console.log(`Response:\n${response.text}`)
        console.log(`Source Documents:`)
        for (const i in response.sourceDocuments){
            console.log(`${i}. ${response.sourceDocuments[i].pageContent.substring(0, 50)}...`);
        }
        return response;
    } catch (error) {
        console.error("Error querying the knowledgebase:", error);
        throw error; // Rethrow the error for centralized error handling
    }
}

// Function to push data to the knowledgebase
async function pushDataToKnowledgebase(data) {
    try {
        const items = data.items;
        const docs = [];

        for (var i in items) {
            var obj = {};
            obj.sampleId = items[i].sampleId || null;
            obj.title = items[i].title || null;
            obj.thumbnails = items[i].thumbnails || null;
            obj.authors = items[i].authors || null;
            obj.url = items[i].url || null;
            obj.creationDateTime = items[i].creationDateTime || null;
            obj.updateDateTime = items[i].updateDateTime || null;
            obj.trackingImage = items[i].trackingImage || null;
            docs.push(new Document({ pageContent: JSON.stringify(obj), metadata: obj }));
        }

        console.log(`Length of docs is ${docs.length}`);

        // Initialize Pinecone database
        const pinecone = new Pinecone();

        // Create a Pinecone index based on the environment variable
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

        console.log("Pushing docs to Pinecone...");

        // Push the documents to the knowledgebase
        await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
            pineconeIndex,
        });

        console.log("Done!");

        return "Data pushed to the knowledgebase.";
    } catch (error) {
        console.error("Error pushing data to the knowledgebase:", error);
        // Handle the error gracefully, e.g., log the error and return an informative error message
        return "Error pushing data to the knowledgebase: " + error.message;
    }
}


app.post('/insert', async (req, res) => {
  console.log('Insert:', req.body);
  const result = await pushDataToKnowledgebase(req.body)
  res.send(result);
});

app.post('/query', async (req, res) => {
  console.log('Query:', req.body.query);
  const result = await queryKnowledgebase(req.body.query)
  res.send(result); 
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening on port 3000'); 
});