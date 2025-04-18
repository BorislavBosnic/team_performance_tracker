// netlify/functions/get-players.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log("Function 'get-players' invoked.");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use Service Key for backend functions

    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase URL or Service Key environment variables missing.");
        return { statusCode: 500, body: "Server configuration error." };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch players, order by score descending for ranking
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('score', { ascending: false });

        if (error) throw error;

        console.log(`Successfully fetched ${data ? data.length : 0} players.`);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Allow CORS
            body: JSON.stringify(data || []), // Return empty array if no data
        };

    } catch (error) {
        console.error("Error fetching players:", error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to fetch players', details: error.message }),
        };
    }
};
