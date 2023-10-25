const query = { query: "show me sharepoint related samples."};

fetch('http://localhost:3000/query', {
    method: 'POST',
    body: JSON.stringify(query),
    headers: { 'Content-Type': 'application/json' }
})
    .then(res => res.json()) // Parse the response as JSON
    .then(data => {
        console.log('Response:');
        console.log(data.text);
        console.log('\nSource Documents:');
        for (const i in data.sourceDocuments) {
            console.log(`${i}. ${data.sourceDocuments[i].pageContent.substring(0, 50)}...`);
        }
    })
    .catch(error => console.error(error));
