/**
 * Raggruppa gli appuntamenti dello stesso cliente che fanno parte di una combo di servizi.
 * I servizi vengono uniti con un " + " (es. "Taglio e Shampoo + Barba modellata").
 */
export function groupComboAppointments(appointments: any[]): any[] {
  if (!appointments || appointments.length === 0) return [];

  const grouped: any[] = [];
  const processedCombos = new Set<string>();

  for (const apt of appointments) {
    const notes = apt.notes || '';
    const comboMatch = notes.match(/\[Combo:\s*(combo_[a-zA-Z0-9_]+)\]/);
    const comboId = comboMatch ? comboMatch[1] : null;

    if (!comboId) {
      // Appuntamento singolo
      grouped.push(apt);
      continue;
    }

    if (processedCombos.has(comboId)) {
      // Già elaborato come parte di una combo
      continue;
    }

    // Recupera tutti gli appuntamenti appartenenti alla stessa combo
    const comboApts = appointments.filter((a) => {
      const aNotes = a.notes || '';
      const aComboMatch = aNotes.match(/\[Combo:\s*(combo_[a-zA-Z0-9_]+)\]/);
      return aComboMatch && aComboMatch[1] === comboId;
    });

    // Ordina per orario di inizio per garantire la sequenzialità
    comboApts.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    // Unisce i nomi dei servizi
    const combinedServiceNames = comboApts
      .map((a) => a.service?.name ?? 'Servizio')
      .join(' + ');

    // Copia i dati dal primo appuntamento ed aggiorna il nome del servizio
    const firstApt = comboApts[0];
    const groupedApt = {
      ...firstApt,
      service: firstApt.service ? {
        ...firstApt.service,
        name: combinedServiceNames,
      } : {
        name: combinedServiceNames,
      },
    };

    grouped.push(groupedApt);
    processedCombos.add(comboId);
  }

  return grouped;
}
