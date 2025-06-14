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

        // response.data includes: is_duplicate and similar_matches
        return {
            is_duplicate: response.data.is_duplicate,
            similar_matches: response.data.similar_matches
        };
    } catch (err) {
        console.error('Error contacting similarity microservice:', err.message || err);
        return { is_duplicate: false, similar_matches: [] };
    }
};

module.exports = { getSimilarityScores };
