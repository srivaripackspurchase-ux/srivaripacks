const supabase = require('./config/supabase');

async function testJoin() {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        created_at,
        company_sizes (calc_type)
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Result:', JSON.stringify(companies, null, 2));
      const formatted = companies.map(c => {
        const types = new Set((c.company_sizes || []).map(s => s.calc_type || 'all'));
        return {
          id: c.id,
          name: c.name,
          available_types: Array.from(types)
        };
      });
      console.log('Formatted:', formatted);
    }
  } catch (err) {
    console.error(err);
  }
}

testJoin();
