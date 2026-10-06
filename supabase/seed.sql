-- Starter reference data. Edit names/buildings to match your dorm.

insert into teams (slug, name, description) values
  ('maintenance', 'Maintenance',     'Plumbing, electrical, HVAC, furniture, appliances'),
  ('it',          'IT Support',      'Wi-Fi and network'),
  ('housekeeping','Housekeeping',    'Cleaning, trash, pest control'),
  ('security',    'Campus Security', 'Locks, access cards, safety and theft'),
  ('housing',     'Housing Office',  'Roommate, noise and general residence issues');

insert into buildings (code, name) values
  ('A', 'Block A'),
  ('B', 'Block B'),
  ('C', 'Block C');

insert into categories (slug, name, description, default_team_id) values
  ('plumbing',   'Plumbing',     'Leaks, blocked or broken toilets, sinks, showers, low water pressure, no hot water',
     (select id from teams where slug = 'maintenance')),
  ('electrical', 'Electrical',   'Power outages, dead sockets, broken lights or switches, sparks, burning smell from wiring',
     (select id from teams where slug = 'maintenance')),
  ('hvac',       'Heating & AC', 'Heating, air conditioning, fans, ventilation, room too hot or too cold',
     (select id from teams where slug = 'maintenance')),
  ('furniture',  'Furniture & Fixtures', 'Beds, desks, chairs, wardrobes, doors, windows, curtains, mirrors',
     (select id from teams where slug = 'maintenance')),
  ('appliance',  'Appliances & Laundry', 'Washing machines, dryers, fridges, kitchen stoves, microwaves, elevators',
     (select id from teams where slug = 'maintenance')),
  ('internet',   'Internet & Wi-Fi', 'No Wi-Fi, slow connection, ethernet port not working',
     (select id from teams where slug = 'it')),
  ('pest',       'Pests',        'Cockroaches, bedbugs, ants, mice, rats, mosquitoes',
     (select id from teams where slug = 'housekeeping')),
  ('cleaning',   'Cleaning & Waste', 'Dirty bathrooms or common areas, overflowing trash, bad smells',
     (select id from teams where slug = 'housekeeping')),
  ('security',   'Security & Access', 'Broken locks, lost keys or access cards, strangers in the building, theft',
     (select id from teams where slug = 'security')),
  ('other',      'Other',        'Noise complaints, roommate issues, or anything that does not fit another category',
     (select id from teams where slug = 'housing'));
