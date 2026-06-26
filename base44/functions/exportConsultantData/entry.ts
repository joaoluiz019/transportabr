import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const toCSV = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(h => `"${('' + (row[h] ?? '')).replace(/"/g, '""')}"`);
    rows.push(values.join(','));
  }
  return rows.join('\n');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, startDate, endDate } = await req.json();

    if (!entityType || !startDate || !endDate) {
      return Response.json({ error: 'Missing: entityType, startDate, endDate' }, { status: 400 });
    }

    if (!['Fueling', 'Expense', 'Billing'].includes(entityType)) {
      return Response.json({ error: 'Invalid entityType. Must be Fueling, Expense, or Billing.' }, { status: 400 });
    }

    const companies = await base44.asServiceRole.entities.Company.filter({ owner_email: user.email });
    if (companies.length === 0) {
      return Response.json({ error: 'Company not found.' }, { status: 404 });
    }
    const companyId = companies[0].id;

    const query = { company_id: companyId, date: { $gte: startDate, $lte: endDate } };

    let data;
    if (entityType === 'Fueling') {
      data = await base44.asServiceRole.entities.Fueling.filter(query);
    } else if (entityType === 'Expense') {
      data = await base44.asServiceRole.entities.Expense.filter(query);
    } else {
      data = await base44.asServiceRole.entities.Billing.filter(query);
    }

    const csv = toCSV(data);
    const filename = `${entityType.toLowerCase()}_${startDate}_${endDate}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});