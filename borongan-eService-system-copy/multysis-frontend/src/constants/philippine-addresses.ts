/**
 * philippine-addresses.ts
 *
 * Static Philippine address hierarchy: Region → Province → City/Municipality
 * Used for cascading dropdowns in the portal (place of birth, etc.)
 * Source: PSGC (Philippine Standard Geographic Code)
 */

export interface PhAddress {
  region: string;
  regionLabel: string;
  provinces: {
    name: string;
    municipalities: string[];
  }[];
}

export const PH_ADDRESSES: PhAddress[] = [
  {
    region: 'ncr',
    regionLabel: 'NCR – National Capital Region',
    provinces: [
      {
        name: 'Metro Manila',
        municipalities: [
          'City of Manila','City of Caloocan','City of Las Piñas','City of Makati',
          'City of Malabon','City of Mandaluyong','City of Marikina','City of Muntinlupa',
          'City of Navotas','City of Parañaque','City of Pasay','City of Pasig',
          'City of Quezon','City of San Juan','City of Taguig','City of Valenzuela',
          'Pateros',
        ],
      },
    ],
  },
  {
    region: 'car',
    regionLabel: 'CAR – Cordillera Administrative Region',
    provinces: [
      { name: 'Abra', municipalities: ['Bangued','Boliney','Bucay','Bucloc','Daguioman','Danglas','Dolores','La Paz','Lacub','Lagangilang','Lagayan','Langiden','Licuan-Baay','Luba','Malibcong','Manabo','Peñarrubia','Pidigan','Pilar','Sallapadan','San Isidro','San Juan','San Quintin','Tayum','Tineg','Tubo','Villaviciosa'] },
      { name: 'Apayao', municipalities: ['Calanasan','Conner','Flora','Kabugao','Luna','Pudtol','Santa Marcela'] },
      { name: 'Benguet', municipalities: ['Atok','City of Baguio','Bakun','Bokod','Buguias','Itogon','Kabayan','Kapangan','Kibungan','La Trinidad','Mankayan','Sablan','Tuba','Tublay'] },
      { name: 'Ifugao', municipalities: ['Aguinaldo','Alfonso Lista','Asipulo','Banaue','Hingyon','Hungduan','Kiangan','Lagawe','Lamut','Mayoyao','Tinoc'] },
      { name: 'Kalinga', municipalities: ['Balbalan','City of Tabuk','Lubuagan','Pasil','Pinukpuk','Rizal','Tanudan','Tinglayan'] },
      { name: 'Mountain Province', municipalities: ['Barlig','Bauko','Besao','Bontoc','Natonin','Paracelis','Sabangan','Sadanga','Sagada','Tadian'] },
    ],
  },
  {
    region: 'region1',
    regionLabel: 'Region I – Ilocos Region',
    provinces: [
      { name: 'Ilocos Norte', municipalities: ['Adams','Bacarra','Badoc','Bangui','City of Batac','Burgos','Carasi','Currimao','Dingras','Dumalneg','City of Laoag','Marcos','Nueva Era','Pagudpud','Paoay','Pasuquin','Piddig','Pinili','San Nicolas','Sarrat','Solsona','Vintar'] },
      { name: 'Ilocos Sur', municipalities: ['Alilem','Banayoyo','Bantay','Burgos','Cabugao','City of Candon','Caoayan','Cervantes','Galimuyod','Gregorio del Pilar','Lidlidda','Magsingal','Nagbukel','Narvacan','Quirino','Salcedo','San Emilio','San Esteban','San Ildefonso','San Juan','San Vicente','Santa','Santa Catalina','Santa Cruz','Santa Lucia','Santa Maria','Santiago','Santo Domingo','Sigay','Sinait','Sugpon','Suyo','Tagudin','City of Vigan'] },
      { name: 'La Union', municipalities: ['Agoo','Aringay','Bacnotan','Bagulin','Balaoan','Bangar','Bauang','Burgos','Caba','Luna','Naguilian','Pugo','Rosario','City of San Fernando','San Gabriel','San Juan','Santo Tomas','Santol','Sudipen','Tubao'] },
      { name: 'Pangasinan', municipalities: ['Agno','Aguilar','City of Alaminos','Alcala','Anda','Asingan','Balungao','Bani','Basista','Bautista','Bayambang','Binalonan','Binmaley','Bolinao','Bugallon','Burgos','Calasiao','City of Dagupan','Dasol','Infanta','Labrador','Laoac','City of Lingayen','Mabini','Malasiqui','Manaoag','Mangaldan','Mangatarem','Mapandan','Natividad','Pozzorubio','Rosales','City of San Carlos','San Fabian','San Jacinto','San Manuel','San Nicolas','San Quintin','Santa Barbara','Santa Maria','Santo Tomas','Sison','Sual','Tayug','Umingan','Urbiztondo','City of Urdaneta','Villasis'] },
    ],
  },
  {
    region: 'region2',
    regionLabel: 'Region II – Cagayan Valley',
    provinces: [
      { name: 'Batanes', municipalities: ['Basco','Itbayat','Ivana','Mahatao','Sabtang','Uyugan'] },
      { name: 'Cagayan', municipalities: ['Abulug','Alcala','Allacapan','Amulung','Aparri','Baggao','Ballesteros','Buguey','Calayan','Camalaniugan','Claveria','Enrile','Gattaran','Gonzaga','Iguig','Lal-lo','Lasam','Pamplona','Peñablanca','Piat','Rizal','Sanchez-Mira','Santa Ana','Santa Praxedes','Santa Teresita','Santo Niño','Solana','Tuao','City of Tuguegarao'] },
      { name: 'Isabela', municipalities: ['Alicia','Angadanan','Aurora','Benito Soliven','Burgos','Cabagan','Cabatuan','City of Cauayan','Cordon','Delfin Albano','Dinapigue','Divilacan','Echague','Gamu','Ilagan City','Jones','Luna','Maconacon','Mallig','Naguilian','Palanan','Quezon','Quirino','Ramon','Reina Mercedes','Roxas','San Agustin','San Guillermo','San Isidro','San Manuel','San Mariano','San Mateo','San Pablo','Santiago City','Santo Tomas','Tumauini'] },
      { name: 'Nueva Vizcaya', municipalities: ['Alfonso Castaneda','Ambaguio','Aritao','Bagabag','Bambang','Bayombong','Diadi','Dupax del Norte','Dupax del Sur','Kasibu','Kayapa','Quezon','Santa Fe','Solano','Villaverde'] },
      { name: 'Quirino', municipalities: ['Aglipay','Cabarroguis','Diffun','Maddela','Nagtipunan','Saguday'] },
    ],
  },
  {
    region: 'region3',
    regionLabel: 'Region III – Central Luzon',
    provinces: [
      { name: 'Aurora', municipalities: ['Baler','Casiguran','Dilasag','Dinalungan','Dingalan','Dipaculao','Maria Aurora','San Luis'] },
      { name: 'Bataan', municipalities: ['Abucay','Bagac','City of Balanga','Dinalupihan','Hermosa','Limay','Mariveles','Morong','Orani','Orion','Pilar','Samal'] },
      { name: 'Bulacan', municipalities: ['Angat','Balagtas','Baliuag','Bocaue','Bulakan','Bustos','Calumpit','Doña Remedios Trinidad','Guiguinto','Hagonoy','City of Malolos','Marilao','City of Meycauayan','Norzagaray','Obando','Pandi','Paombong','Plaridel','Pulilan','San Ildefonso','City of San Jose del Monte','San Miguel','San Rafael','Santa Maria'] },
      { name: 'Nueva Ecija', municipalities: ['Aliaga','Bongabon','City of Cabanatuan','Cabiao','Carranglan','Cuyapo','Gabaldon','City of Gapan','General Mamerto Natividad','General Tinio','Guimba','Jaen','Laur','Licab','Llanera','Lupao','City of Munoz','Nampicuan','Palayan City','Pantabangan','Peñaranda','Quezon','Rizal','San Antonio','San Isidro','San Jose City','San Leonardo','Santa Rosa','Santo Domingo','Talavera','Talugtug','Zaragoza'] },
      { name: 'Pampanga', municipalities: ['Angeles City','Apalit','Arayat','Bacolor','Candaba','Floridablanca','Guagua','Lubao','Mabalacat City','Macabebe','Magalang','Masantol','Mexico','Minalin','Porac','City of San Fernando','San Luis','San Simon','Santa Ana','Santa Rita','Santo Tomas','Sasmuan'] },
      { name: 'Tarlac', municipalities: ['Anao','Bamban','Camiling','Capas','Concepcion','Gerona','La Paz','Mayantoc','Moncada','Paniqui','Pura','Ramos','San Clemente','San Jose','San Manuel','Santa Ignacia','City of Tarlac','Victoria'] },
      { name: 'Zambales', municipalities: ['Botolan','Cabangan','Candelaria','Castillejos','Iba','Masinloc','Olongapo City','Palauig','San Antonio','San Felipe','San Marcelino','San Narciso','Santa Cruz','Subic'] },
    ],
  },
  {
    region: 'region4a',
    regionLabel: 'Region IV‑A – CALABARZON',
    provinces: [
      { name: 'Batangas', municipalities: ['Agoncillo','Alitagtag','Balayan','Balete','City of Batangas','Bauan','Calaca','Calatagan','Cuenca','Ibaan','Laurel','Lemery','Lian','City of Lipa','Lobo','Mabini','Malvar','Mataas na Kahoy','Nasugbu','Padre Garcia','Rosario','San Jose','San Juan','San Luis','San Nicolas','San Pascual','Santa Teresita','Santo Tomas','Taal','Talisay','City of Tanauan','Taysan','Tingloy','Tuy'] },
      { name: 'Cavite', municipalities: ['Alfonso','Amadeo','City of Bacoor','Carmona','City of Cavite','City of Dasmariñas','General Emilio Aguinaldo','City of General Trias','City of Imus','Indang','Kawit','Magallanes','Maragondon','City of Mendez','Naic','Noveleta','Rosario','Silang','Tagaytay City','Tanza','Ternate','Trece Martires City'] },
      { name: 'Laguna', municipalities: ['Alaminos','Bay','City of Biñan','Cabuyao City','City of Calamba','Calauan','Cavinti','Famy','Kalayaan','Liliw','Los Baños','Luisiana','Lumban','Mabitac','Magdalena','Majayjay','Nagcarlan','Paete','Pagsanjan','Pakil','Pangil','Pila','Rizal','City of San Pablo','San Pedro City','Santa Cruz','Santa Maria','City of Santa Rosa','Siniloan','Victoria'] },
      { name: 'Quezon', municipalities: ['Agdangan','Alabat','Atimonan','Buenavista','Burdeos','Calauag','Candelaria','Catanauan','Dolores','General Luna','General Nakar','Guinayangan','Gumaca','Infanta','Jomalig','Lopez','Lucban','City of Lucena','Macalelon','Mauban','Mulanay','Padre Burgos','Pagbilao','Panukulan','Patnanungan','Perez','Pitogo','Plaridel','Quezon','Real','Sampaloc','San Andres','San Antonio','San Francisco','San Narciso','Sariaya','Tagkawayan','City of Tayabas','Tiaong','Unisan'] },
      { name: 'Rizal', municipalities: ['Angono','City of Antipolo','Baras','Binangonan','Cainta','Cardona','Jala-Jala','Rodriguez','Morong','Pililla','San Mateo','Tanay','Taytay','Teresa'] },
    ],
  },
  {
    region: 'region4b',
    regionLabel: 'Region IV‑B – MIMAROPA',
    provinces: [
      { name: 'Marinduque', municipalities: ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos'] },
      { name: 'Occidental Mindoro', municipalities: ['Abra de Ilog','Calintaan','Looc','Lubang','Magsaysay','Mamburao','Paluan','Rizal','Sablayan','San Jose','Santa Cruz'] },
      { name: 'Oriental Mindoro', municipalities: ['Baco','Bansud','Bongabong','Bulalacao','City of Calapan','Gloria','Mansalay','Naujan','Pinamalayan','Pola','Puerto Galera','Roxas','San Teodoro','Socorro','Victoria'] },
      { name: 'Palawan', municipalities: ['Aborlan','Agutaya','Araceli','Balabac','Bataraza','Brooke\'s Point','Busuanga','Cagayancillo','Coron','Culion','Cuyo','Dumaran','El Nido','Kalayaan','Linapacan','Magsaysay','Narra','City of Puerto Princesa','Quezon','Rizal','Roxas','San Vicente','Sofronio Española','Taytay'] },
      { name: 'Romblon', municipalities: ['Alcantara','Banton','Cajidiocan','Calatrava','Concepcion','Corcuera','Ferrol','Looc','Magdiwang','Odiongan','Romblon','San Agustin','San Andres','San Fernando','San Jose','Santa Fe','Santa Maria'] },
    ],
  },
  {
    region: 'region5',
    regionLabel: 'Region V – Bicol Region',
    provinces: [
      { name: 'Albay', municipalities: ['Bacacay','Camalig','Daraga','Guinobatan','Jovellar','Legazpi City','Libon','City of Ligao','Malilipot','Malinao','Manito','Oas','Pio Duran','Polangui','Rapu-Rapu','City of Tabaco','Tiwi'] },
      { name: 'Camarines Norte', municipalities: ['Basud','Capalonga','Daet','Jose Panganiban','Labo','Mercedes','Paracale','San Lorenzo Ruiz','San Vicente','Santa Elena','Talisay','Vinzons'] },
      { name: 'Camarines Sur', municipalities: ['Baao','Balatan','Bato','Bombon','Buhi','Bula','Cabusao','Calabanga','Camaligan','Canaman','Caramoan','Del Gallego','Gainza','Garchitorena','Goa','Iriga City','Lagonoy','Libmanan','Lupi','Magarao','Milaor','Minalabac','Nabua','City of Naga','Ocampo','Pamplona','Pasacao','Pili','Presentacion','Ragay','Sagñay','San Fernando','San Jose','Sipocot','Siruma','Tigaon','Tinambac'] },
      { name: 'Catanduanes', municipalities: ['Bagamanoc','Baras','Bato','Caramoran','Gigmoto','Pandan','Panganiban','San Andres','San Miguel','Viga','Virac'] },
      { name: 'Masbate', municipalities: ['Aroroy','Baleno','Balud','Batuan','Cataingan','Cawayan','Claveria','Dimasalang','Esperanza','Mandaon','City of Masbate','Milagros','Mobo','Monreal','Palanas','Pio V. Corpuz','Placer','San Fernando','San Jacinto','San Pascual','Uson'] },
      { name: 'Sorsogon', municipalities: ['Barcelona','Bulan','Bulusan','Casiguran','Castilla','Donsol','Gubat','Irosin','Juban','Magallanes','Matnog','Pilar','Prieto Diaz','Santa Magdalena','City of Sorsogon'] },
    ],
  },
  {
    region: 'region6',
    regionLabel: 'Region VI – Western Visayas',
    provinces: [
      { name: 'Aklan', municipalities: ['Altavas','Balete','Banga','Batan','Buruanga','Ibajay','Kalibo','Lezo','Libacao','Madalag','Makato','Malay','Malinao','Nabas','New Washington','Numancia','Tangalan'] },
      { name: 'Antique', municipalities: ['Anini-y','Barbaza','Belison','Bugasong','Caluya','Culasi','Hamtic','Laua-an','Libertad','Pandan','Patnongon','San Jose de Buenavista','San Remigio','Sebaste','Sibalom','Tibiao','Tobias Fornier','Valderrama'] },
      { name: 'Capiz', municipalities: ['Cuartero','Dao','Dumalag','Dumarao','Ivisan','Jamindan','Ma-ayon','Mambusao','Panay','Panitan','Pilar','Pontevedra','President Roxas','City of Roxas','Sapi-an','Sigma','Tapaz'] },
      { name: 'Guimaras', municipalities: ['Buenavista','Jordan','Nueva Valencia','San Lorenzo','Sibunag'] },
      { name: 'Iloilo', municipalities: ['Ajuy','Alimodian','Anilao','Badiangan','Balasan','Banate','Barotac Nuevo','Barotac Viejo','Batad','Bingawan','Cabatuan','Calinog','Carles','Concepcion','Dingle','Dueñas','Dumangas','Estancia','Guimbal','Igbaras','City of Iloilo','Janiuay','Lambunao','Leganes','Lemery','Leon','Maasin','Miagao','Mina','New Lucena','Oton','City of Passi','Pavia','Pototan','San Dionisio','San Enrique','San Joaquin','San Miguel','San Rafael','Santa Barbara','Sara','Tigbauan','Tubungan','Zarraga'] },
      { name: 'Negros Occidental', municipalities: ['Bacolod City','Bago City','Binalbagan','Calatrava','Candoni','Cauayan','Enrique B. Magalona','City of Escalante','City of Himamaylan','Hinigaran','Hinoba-an','Ilog','Isabela','City of Kabankalan','La Carlota City','La Castellana','Manapla','Moises Padilla','Murcia','Pontevedra','Pulupandan','City of Sagay','San Carlos City','San Enrique','City of Silay','City of Sipalay','City of Talisay','Toboso','Valladolid','City of Victorias'] },
    ],
  },
  {
    region: 'region7',
    regionLabel: 'Region VII – Central Visayas',
    provinces: [
      { name: 'Bohol', municipalities: ['Alburquerque','Alicia','Anda','Antequera','Baclayon','Balilihan','Batuan','Bien Unido','Bilar','Buenavista','Calape','Candijay','Carmen','Catigbian','Clarin','Corella','Cortes','Dagohoy','Danao','Dauis','Dimiao','Duero','Garcia Hernandez','Guindulman','Inabanga','Jagna','Lila','Loay','Loboc','Loon','Mabini','Maribojoc','Panglao','Pilar','Pres. Carlos P. Garcia','Sagbayan','San Isidro','San Miguel','Sevilla','Sierra Bullones','Sikatuna','City of Tagbilaran','Talibon','Trinidad','Tubigon','Ubay','Valencia'] },
      { name: 'Cebu', municipalities: ['Alcantara','Alcoy','Alegria','Aloguinsan','Argao','Asturias','Badian','Balamban','Bantayan','Barili','City of Bogo','Boljoon','Borbon','City of Carcar','Carmen','Catmon','City of Cebu','Compostela','Consolacion','Cordova','Daanbantayan','Dalaguete','Danao City','Dumanjug','Ginatilan','City of Lapu-Lapu','Liloan','Madridejos','Malabuyoc','City of Mandaue','Medellin','Minglanilla','Moalboal','City of Naga','Oslob','Pilar','Pinamungajan','Poro','Ronda','Samboan','San Fernando','San Francisco','San Remigio','Santa Fe','Santander','Sibonga','Sogod','Tabogon','Tabuelan','City of Talisay','Toledo City','Tuburan','Tudela'] },
      { name: 'Negros Oriental', municipalities: ['Amlan','Ayungon','Bacong','City of Bais','Basay','City of Bayawan','Bindoy','City of Canlaon','Dauin','City of Dumaguete','Guihulngan City','Jimalalud','La Libertad','Mabinay','Manjuyod','Pamplona','San Jose','Santa Catalina','Siaton','Sibulan','City of Tanjay','Tayasan','Valencia','Vallehermoso','Zamboanguita'] },
      { name: 'Siquijor', municipalities: ['Enrique Villanueva','Larena','Lazi','Maria','San Juan','Siquijor'] },
    ],
  },
  {
    region: 'region8',
    regionLabel: 'Region VIII – Eastern Visayas',
    provinces: [
      { name: 'Biliran', municipalities: ['Almeria','Biliran','Cabucgayan','Caibiran','Culaba','Kawayan','Maripipi','Naval'] },
      { name: 'Eastern Samar', municipalities: ['Arteche','Balangiga','Balangkayan','City of Borongan','Can-avid','Dolores','General MacArthur','Giporlos','Guiuan','Hernani','Jipapad','Lawaan','Llorente','Maslog','Maydolong','Mercedes','Oras','Quinapondan','Salcedo','San Julian','San Policarpo','Sulat','Taft'] },
      { name: 'Leyte', municipalities: ['Abuyog','Alangalang','Albuera','Babatngon','Barugo','Bato','City of Baybay','Burauen','Calubian','Capoocan','Carigara','Dagami','Dulag','Hilongos','Hindang','Inopacan','Isabel','Jaro','Javier','Julita','Kananga','City of Maasin','Macarthur','Mahaplag','Matag-ob','Matalom','Mayorga','Merida','City of Ormoc','Palompon','Palo','Pastrana','San Isidro','San Miguel','Santa Fe','Tabango','Tabontabon','City of Tacloban','Tanauan','Tolosa','Tunga','Villaba'] },
      { name: 'Northern Samar', municipalities: ['Allen','Biri','Bobon','Capul','Catarman','Catubig','Gamay','Laoang','Lapinig','Las Navas','Lavezares','Lope de Vega','Mapanas','Mondragon','Palapag','Pambujan','Rosario','San Antonio','San Isidro','San Jose','San Roque','San Vicente','Silvino Lobos','Victoria'] },
      { name: 'Samar', municipalities: ['Almagro','Basey','Calbayog City','Calbiga','Catbalogan City','Daram','Gandara','Hinabangan','Jiabong','Marabut','Matuguinao','Motiong','Pagsanghan','Paranas','Pinabacdao','San Jorge','San Jose de Buan','San Sebastian','Santa Margarita','Santa Rita','Santo Niño','Tagapul-an','Talalora','Tarangnan','Villareal','Zumarraga'] },
      { name: 'Southern Leyte', municipalities: ['Anahawan','Bontoc','Hinunangan','Hinundayan','Libagon','Liloan','Limasawa','City of Maasin','Macrohon','Malitbog','Padre Burgos','Pintuyan','Saint Bernard','San Francisco','San Juan','San Ricardo','Silago','Sogod','Tomas Oppus'] },
    ],
  },
  {
    region: 'region9',
    regionLabel: 'Region IX – Zamboanga Peninsula',
    provinces: [
      { name: 'Zamboanga del Norte', municipalities: ['Baliguian','Godod','Gutalac','Jose Dalman','Kalawit','Katipunan','La Libertad','Labason','Liloy','Manukan','Mutia','Piñan','Polanco','Pres. Manuel A. Roxas','Rizal','Salug','San Miguel','Sergio Osmeña Sr.','Siayan','Sibuco','Sibutad','Sindangan','Siocon','Sirawai','Tampilisan','City of Dapitan','City of Dipolog'] },
      { name: 'Zamboanga del Sur', municipalities: ['Aurora','Bayog','Dimataling','Dinas','Dumalinao','Dumingag','Guipos','Josefina','Kumalarang','Labangan','Lakewood','Lapuyan','Mahayag','Margosatubig','Midsalip','Molave','Pitogo','Ramon Magsaysay','San Miguel','San Pablo','Tabina','Tambulig','Tigbao','Tukuran','Tudanan','Vincenzo A. Sagun','City of Pagadian','City of Zamboanga'] },
      { name: 'Zamboanga Sibugay', municipalities: ['Alicia','Buug','Diplahan','Imelda','Ipil','Kabasalan','Mabuhay','Malangas','Naga','Olutanga','Payao','Roseller Lim','Siay','Talusan','Titay','Tungawan'] },
    ],
  },
  {
    region: 'region10',
    regionLabel: 'Region X – Northern Mindanao',
    provinces: [
      { name: 'Bukidnon', municipalities: ['Baungon','Cabanglasan','Damulog','Dangcagan','Don Carlos','Impasug-ong','Kadingilan','Kalilangan','Kibawe','Kitaotao','Lantapan','Libona','City of Malaybalay','Malitbog','Manolo Fortich','Maramag','Pangantucan','Quezon','San Fernando','Sumilao','Talakag','City of Valencia'] },
      { name: 'Camiguin', municipalities: ['Catarman','Guinsiliban','Mahinog','Mambajao','Sagay'] },
      { name: 'Lanao del Norte', municipalities: ['Bacolod','Baloi','Baroy','Balo-i','Iligan City','Kapatagan','Kauswagan','Kolambugan','Lala','Linamon','Magsaysay','Maigo','Matungao','Munai','Nunungan','Pantao Ragat','Pantar','Poona Piagapo','Salvador','Sapad','Sultan Naga Dimaporo','Tagoloan','Tangcal','Tubod'] },
      { name: 'Misamis Occidental', municipalities: ['Aloran','Baliangao','Bonifacio','Calamba','Clarin','Concepcion','Jimenez','Lopez Jaena','Oroquieta City','Ozamiz City','Panaon','Plaridel','Sapang Dalaga','Sinacaban','Tangub City','Tudela'] },
      { name: 'Misamis Oriental', municipalities: ['Alubijid','Balingasag','Balingoan','Binuangan','Cagayan de Oro City','Claveria','El Salvador City','Gingoog City','Gitagum','Initao','Jasaan','Kinoguitan','Lagonglong','Laguindingan','Libertad','Lugait','Magsaysay','Manticao','Medina','Naawan','Opol','Salay','Sugbongcogon','Tagoloan','Talisayan','Villanueva'] },
    ],
  },
  {
    region: 'region11',
    regionLabel: 'Region XI – Davao Region',
    provinces: [
      { name: 'Davao de Oro', municipalities: ['Compostela','Laak','Mabini','Maco','Maragusan','Mawab','Monkayo','Montevista','Nabunturan','New Bataan','Pantukan'] },
      { name: 'Davao del Norte', municipalities: ['Asuncion','Braulio E. Dujali','Carmen','City of Panabo','Island Garden City of Samal','Kapalong','New Corella','City of Tagum','Talaingod','Santo Tomas'] },
      { name: 'Davao del Sur', municipalities: ['Bansalan','City of Davao','Digos City','Hagonoy','Kiblawan','Magsaysay','Malalag','Matanao','Padada','Santa Cruz','Sulop'] },
      { name: 'Davao Occidental', municipalities: ['Don Marcelino','Jose Abad Santos','Malita','Santa Maria','Sarangani'] },
      { name: 'Davao Oriental', municipalities: ['Baganga','Banaybanay','Boston','Caraga','Cateel','Governor Generoso','Lupon','Manay','City of Mati','San Isidro','Tarragona'] },
    ],
  },
  {
    region: 'region12',
    regionLabel: 'Region XII – SOCCSKSARGEN',
    provinces: [
      { name: 'Cotabato', municipalities: ['Alamada','Aleosan','Arakan','Banisilan','Carmen','Kabacan','City of Kidapawan','Libungan','Magpet','Makilala','Matalam','Midsayap','Mlang','Pigcawayan','Pikit','President Roxas','Tulunan'] },
      { name: 'Sarangani', municipalities: ['Alabel','Glan','Kiamba','Maasim','Maitum','Malapatan','Malungon'] },
      { name: 'South Cotabato', municipalities: ['Banga','City of General Santos','Koronadal City','Lake Sebu','Norala','Polomolok','Santo Niño','Surallah','T\'boli','Tampakan','Tantangan','Tupi'] },
      { name: 'Sultan Kudarat', municipalities: ['Bagumbayan','Columbio','Esperanza','Isulan','Kalamansig','Lambayong','Lebak','Lutayan','Palimbang','President Quirino','Senator Ninoy Aquino','City of Tacurong'] },
    ],
  },
  {
    region: 'region13',
    regionLabel: 'Region XIII – Caraga',
    provinces: [
      { name: 'Agusan del Norte', municipalities: ['Buenavista','City of Butuan','Cabadbaran City','Carmen','Jabonga','Kitcharao','Las Nieves','Magallanes','Nasipit','Remedios T. Romualdez','Santiago','Tubay'] },
      { name: 'Agusan del Sur', municipalities: ['Bayugan City','Bunawan','Esperanza','La Paz','Loreto','Prosperidad','Rosario','San Francisco','San Luis','Santa Josefa','Santo Tomas','Sibagat','Talacogon','Trento','Veruela'] },
      { name: 'Dinagat Islands', municipalities: ['Basilisa','Cagdianao','Dinagat','Libjo','Loreto','San Jose','Tubajon'] },
      { name: 'Surigao del Norte', municipalities: ['Alegria','Bacuag','Burgos','Claver','Dapa','Del Carmen','General Luna','Gigaquit','Mainit','Malimono','City of Surigao','Pilar','Placer','San Benito','San Francisco','San Isidro','Santa Monica','Sison','Socorro','Tagana-an','Tubod'] },
      { name: 'Surigao del Sur', municipalities: ['Barobo','Bayabas','City of Bislig','Cagwait','Cantilan','Carmen','Carrascal','Cortes','Hinatuan','Lanuza','Lianga','Lingig','Madrid','Marihatag','San Agustin','San Miguel','Tagbina','Tago','City of Tandag'] },
    ],
  },
  {
    region: 'barmm',
    regionLabel: 'BARMM – Bangsamoro Autonomous Region in Muslim Mindanao',
    provinces: [
      { name: 'Basilan', municipalities: ['Akbar','Al-Barka','City of Lamitan','Lantawan','Maluso','Sumisip','Tabuan-Lasa','Tipo-Tipo','Tuburan','Ungkaya Pukan'] },
      { name: 'Lanao del Sur', municipalities: ['Bacolod-Kalawi','Balabagan','Balindong','Bayang','Binidayan','Buadiposo-Buntong','Bubong','Bumbaran','Butig','Calanogas','Ganassi','Kapai','Kapatagan','Lumba-Bayabao','Lumbaca-Unayan','Lumbatan','Lumbayanague','Madalum','Madamba','Maguing','Malabang','Marantao','City of Marawi','Marogong','Masiu','Mulondo','Pagayawan','Piagapo','Picong','Poona Bayabao','Pualas','Ramain','Saguiaran','Sultan Dumalondong','Sultan Gumander','Tagoloan II','Tamparan','Taraka','Tubaran','Tugaya','Wao'] },
      { name: 'Maguindanao del Norte', municipalities: ['Barira','Buldon','Datu Blah T. Sinsuat','Datu Odin Sinsuat','Kabuntalan','Matanog','Northern Kabuntalan','Parang','Sultan Kudarat','Sultan Mastura','Upi'] },
      { name: 'Maguindanao del Sur', municipalities: ['Ampatuan','Buluan','City of Cotabato','Datu Abdullah Sangki','Datu Anggal Midtimbang','Datu Hoffer Ampatuan','Datu Montawal','Datu Paglas','Datu Piang','Datu Salibo','Datu Saudi-Ampatuan','Datu Unsay','Gen. Salipada K. Pendatun','Guindulungan','Mamasapano','Mangudadatu','Pagalungan','Paglat','Pandag','Rajah Buayan','Shariff Aguak','Shariff Saydona Mustapha','South Upi','Sultan sa Barongis','Talayan','Talitay'] },
      { name: 'Sulu', municipalities: ['Banguingui','Hadji Panglima Tahil','Indanan','Jolo','Kalingalan Caluang','Lugus','Luuk','Maimbung','Old Panamao','Omar','Pandami','Panglima Estino','Pangutaran','Parang','Pata','Patikul','Siasi','Talipao','Tapul','Tongkil'] },
      { name: 'Tawi-Tawi', municipalities: ['Bongao','Languyan','Mapun','Panglima Sugala','Sapa-Sapa','Sibutu','Simunul','Sitangkai','South Ubian','Tandubas','Turtle Islands'] },
    ],
  },
  {
    region: 'nir',
    regionLabel: 'NIR – Negros Island Region',
    provinces: [
      { name: 'Negros Occidental', municipalities: ['Bacolod City','Bago City','Binalbagan','Calatrava','Candoni','Cauayan','Enrique B. Magalona','City of Escalante','City of Himamaylan','Hinigaran','Hinoba-an','Ilog','Isabela','City of Kabankalan','La Carlota City','La Castellana','Manapla','Moises Padilla','Murcia','Pontevedra','Pulupandan','City of Sagay','San Carlos City','San Enrique','City of Silay','City of Sipalay','City of Talisay','Toboso','Valladolid','City of Victorias'] },
      { name: 'Negros Oriental', municipalities: ['Amlan','Ayungon','Bacong','City of Bais','Basay','City of Bayawan','Bindoy','City of Canlaon','Dauin','City of Dumaguete','Guihulngan City','Jimalalud','La Libertad','Mabinay','Manjuyod','Pamplona','San Jose','Santa Catalina','Siaton','Sibulan','City of Tanjay','Tayasan','Valencia','Vallehermoso','Zamboanguita'] },
    ],
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export const getRegions = () =>
  PH_ADDRESSES.map(({ region, regionLabel }) => ({ value: region, label: regionLabel }));

export const getProvincesByRegion = (region: string) => {
  const found = PH_ADDRESSES.find((r) => r.region === region);
  if (!found) return [];
  return found.provinces.map(({ name }) => ({ value: name, label: name }));
};

export const getMunicipalitiesByProvince = (region: string, province: string) => {
  const found = PH_ADDRESSES.find((r) => r.region === region);
  if (!found) return [];
  const prov = found.provinces.find((p) => p.name === province);
  if (!prov) return [];
  return prov.municipalities.map((m) => ({ value: m, label: m }));
};
