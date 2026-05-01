-- Translate department names and descriptions to Romanian
UPDATE departments SET 
    name = 'Psihiatrie',
    description = 'Tulburări de sănătate mintală și terapie psihiatrică',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '3DAB9882-4600-460D-AF68-089DB3FC0E17';

UPDATE departments SET 
    name = 'Ortopedie',
    description = 'Afectiuni musculo-scheletice, fracturi si protezare articulară',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '6ED7C815-AD33-41EA-81E9-230BD803A064';

UPDATE departments SET 
    name = 'Medicină Generală',
    description = 'Consultatii generale de asistentă primară si medicină internă',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '9DBB4D66-E04D-40D6-830C-43265C572567';

UPDATE departments SET 
    name = 'Endocrinologie',
    description = 'Tulburări ale sistemului endocrin, inclusiv diabet și afecțiuni tiroidiene',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '3F7535CE-BE23-407D-B4F3-525473CCCA27';

UPDATE departments SET 
    name = 'Oncologie',
    description = 'Diagnostic oncologic, chimioterapie, radioterapie și îngrijiri paliative',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '9D07C733-F19E-4F33-AA69-5921CB858DF1';

UPDATE departments SET 
    name = 'Dermatologie',
    description = 'Afecțiuni ale pielii, părului și unghiilor',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'C7AD55DF-10CD-48EE-998D-65D656504A8E';

UPDATE departments SET 
    name = 'Radiologie',
    description = 'Imagistică medicală, inclusiv radiografie, CT, RMN și ecografie',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '434B9D78-650D-4116-973B-6BE634AD0CC9';

UPDATE departments SET 
    name = 'Laborator',
    description = 'Analize clinice de laborator, anatomie patologică și servicii de diagnostic',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'FBB28188-86BD-49B2-BB73-7A5E84598C0A';

UPDATE departments SET 
    name = 'Gastroenterologie',
    description = 'Boli ale sistemului digestiv și ale tractului gastrointestinal',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'A9B24BFE-C0B0-4D9F-9DEC-7EF152BC9064';

UPDATE departments SET 
    name = 'Pneumologie',
    description = 'Boli respiratorii, inclusiv astm, BPOC și cancer pulmonar',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '8946A5C9-37AE-4457-9F03-867701F7FBC0';

UPDATE departments SET 
    name = 'Nefrologie',
    description = 'Boli renale, dializă și gestionarea funcției renale',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '32180850-A52A-4D2F-856A-8D7CBBA89018';

UPDATE departments SET 
    name = 'Medicină de Urgență',
    description = 'Îngrijire imediată pentru afecțiuni acute și stări care pun viața în pericol',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'F7453730-B7BD-4BA6-B14C-9E1CE0E2C993';

UPDATE departments SET 
    name = 'Neurologie',
    description = 'Tulburări ale sistemului nervos, inclusiv accident vascular cerebral și epilepsie',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'C3FCFCEC-FAF2-4E29-8B81-9F6154EBD35D';

UPDATE departments SET 
    name = 'Pediatrie',
    description = 'Îngrijire medicală pentru sugari, copii și adolescenți',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'E5AC3BF9-390D-41B6-BD72-B866FE832AA6';

UPDATE departments SET 
    name = 'Hematologie',
    description = 'Afecțiuni ale sângelui, inclusiv anemie, tulburări de coagulare și cancere hematologice',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '3B0E7B1C-718D-4D57-901F-BF5D48501318';

UPDATE departments SET 
    name = 'Cardiologie',
    description = 'Diagnosticul și tratamentul bolilor cardiace și cardiovasculare',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = '9F7B6F8B-8753-40B5-8321-C758E322197F';

UPDATE departments SET 
    name = 'Chirurgie Generală',
    description = 'Proceduri chirurgicale elective și de urgență la nivelul tuturor sistemelor de organe',
    updated_at = SYSDATETIMEOFFSET()
WHERE id = 'A223A5D8-1F3D-4E7A-83F8-D78629B12B99';