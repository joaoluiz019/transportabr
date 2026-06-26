import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Esta função não é mais necessária pois a associação é feita diretamente
// via Driver.email no DriverPortal e Layout.
// Mantida para compatibilidade mas retorna sucesso sem fazer nada crítico.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // A associação agora é feita pelo email do Driver, sem necessidade de atualizar o User
    return Response.json({ status: 'success', message: 'Associação gerenciada pelo email do motorista.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});