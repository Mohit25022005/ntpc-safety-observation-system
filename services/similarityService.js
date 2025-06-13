// services/similarityService.js
const axios = require('axios');

const getSimilarityScores = async (newText, existingReports) => {
    try {
        const response = await axios.post('http://localhost:8000/similarity', {
            new_text: newText,
            existing: existingReports.map(r => ({
                id: r._id.toString(),
                text: r.incidentDetails
            }))
        });

        return response.data.similarities;
    } catch (err) {
        console.error('Error contacting similarity microservice:', err.message || err);
        return [];
    }
};

module.exports = { getSimilarityScores };
