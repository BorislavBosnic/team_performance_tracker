const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Supabase credentials are missing.' }),
        };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from('channels')
            .select('username, scheduled_messages_count');

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};