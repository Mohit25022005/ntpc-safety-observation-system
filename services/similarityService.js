const axios = require('axios');

const SIMILARITY_SERVICE_URL = process.env.SIMILARITY_SERVICE_URL || 'http://localhost:8000';

const getSimilarityScores = async (newText, existingReports) => {
    try {
        const response = await axios.post(`${SIMILARITY_SERVICE_URL}/similarity`, {
            new_text: newText,
            existing: existingReports.map(r => ({
                id: r._id.toString(),
                text: r.incidentDetails
            }))
        });

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
