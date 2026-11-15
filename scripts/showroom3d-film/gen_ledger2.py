#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Writes docs/showroom3d/film-src/journey2-ledger.json and journey2-ledger.md (the credits ledger of film v2).
The data below is the record of every Higgsfield generation made for v2 (job id, model, params, quote = charge, prompt).
Run: python3 gen_ledger2.py   (from this folder; no network, no credits)"""
import json
import os

CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/"
BWTC = ("Photorealistic documentary film still, dusk, Manama, Bahrain: the Bahrain World Trade Center seen from across calm water, exactly as in reality: two identical 50-storey sail-shaped towers standing side by side, each tower a tapering triangular-section form with curved sides narrowing to a point at the top like a ship's sail, pale cream-grey cladding with long dark glass bands, and between the two towers three horizontal sky bridges each carrying one large three-bladed horizontal-axis wind turbine. Warm sunset sky, glowing city lights, a few low buildings and a corniche in front. 35mm motion-picture film look, subtle film grain. No text, no signs, no logos, no watermark, no people in the foreground.")
SEED = dict(model="seedream_5_0_flash", params={"resolution": "2k", "aspect_ratio": "16:9"}, credits=0.5)
GPT = dict(model="gpt_image_2_6", params={"resolution": "2k", "quality": "medium", "aspect_ratio": "16:9"}, credits=1.0)
ITEMS = []


def add(key, kind, base, job, url_file, prompt, used=True, note="", **kw):
    d = dict(key=key, type=kind, **base)
    d.update(job_id=job, result_url=CDN + url_file if url_file else None, used_in_film=used, prompt=prompt)
    if note:
        d["note"] = note
    d.update(kw)
    ITEMS.append(d)


# ---- model test of one landmark (BWTC): which model draws a famous building correctly
add("bwtc_test_seedream", "image", SEED, "d1db9d95-db3d-425e-88e2-1b038487017f", "hf_20261115_115533_d1db9d95-db3d-425e-88e2-1b038487017f.png", BWTC, used=False,
    note="REJECTED: the towers were drawn as two parallel tall blades, not the real triangular sail towers")
add("bwtc_test_nano_banana_2_1", "image", dict(model="nano_banana_2_1", params={"resolution": "2k", "aspect_ratio": "16:9", "enable_image_search": True}, credits=2.0),
    "e4590cc3-3ce7-45f8-b698-37d6448abbba", "hf_20261115_115534_e4590cc3-3ce7-45f8-b698-37d6448abbba.png", BWTC, used=False,
    note="Recognisable but turbines tilted and only two blades; 2x the price of GPT Image 2.6 medium, not used")
add("lm_bwtc", "image", GPT, "3c8813ef-5a8b-4cf2-8da3-83cab1fe32fb", "hf_20261115_115536_3c8813ef-5a8b-4cf2-8da3-83cab1fe32fb.png", BWTC,
    note="Landmark, accepted: two triangular sail towers, three bridges with three turbines, podium. Best of the three models, so GPT Image 2.6 medium was used for every landmark")

NOTXT = " 35mm motion-picture film look, subtle film grain. No text, no signs, no logos, no watermark, no flags."
add("lm_dawn", "image", GPT, "23bef50f-94fb-466e-9bf2-0c7250d2372d", "hf_20261115_115823_23bef50f-94fb-466e-9bf2-0c7250d2372d.png",
    "Photorealistic documentary film still at dawn over Manama, Bahrain: a calm bay in soft pink and gold first light, in the foreground a traditional wooden Gulf dhow with a long curved prow moored near a stone seawall, across the water the Manama skyline of modern glass towers with the Bahrain World Trade Center clearly recognisable in the middle distance: two identical tall sail-shaped triangular towers tapering to points, three horizontal bridges between them each carrying one wind turbine. Quiet, hopeful, cinematic, 35mm motion-picture film look, subtle film grain. No text, no signs, no logos, no watermark, no flags.",
    note="Landmark (BWTC + dhow), accepted; start frame of v6_dawn")
add("lm_fort", "image", GPT, "7b2975f0-33d6-4775-9016-57f5399b1a5b", "hf_20261115_115823_7b2975f0-33d6-4775-9016-57f5399b1a5b.png",
    "Photorealistic documentary film still at golden hour: Qal'at al-Bahrain, the ancient fort of Bahrain (UNESCO World Heritage site), exactly as in reality: a large square fortress of weathered sand-coloured stone with thick sloping walls and tall rectangular corner towers with crenellations, built on an archaeological mound beside the sea, a dense green date-palm grove behind it and the Gulf with a few fishing boats in front, ancient tell ruins in the foreground sand. Warm low sun, long shadows, quiet." + NOTXT.replace(" No text", " No people, no text"),
    note="Landmark, plausible (fort on a tell beside the sea with palm grove); less certain than the BWTC; shown without a name")
add("lm_causeway", "image", GPT, "b754116e-f3ac-440e-a656-2330797e1a22", "hf_20261115_115822_b754116e-f3ac-440e-a656-2330797e1a22.png",
    "Photorealistic aerial drone photograph at golden hour of the King Fahd Causeway between Bahrain and Saudi Arabia, exactly as in reality: a long straight multi-lane highway on low bridge spans crossing shallow turquoise sea, running to the horizon, with a man-made rectangular island mid-way carrying border-control buildings and one tall slender tower with a rounded observation platform near its top. A few cars on the road. Warm light, sparkling water." + NOTXT,
    note="Landmark, accepted (causeway, central island, observation tower); start frame of v5_causeway")
add("lm_fateh", "image", GPT, "7d61975c-e8c7-494b-adb2-5e2e5f63357d", "hf_20261115_115823_7d61975c-e8c7-494b-adb2-5e2e5f63357d.png",
    "Photorealistic architectural photograph at golden hour of the Al Fateh Grand Mosque in Manama, Bahrain, exactly as in reality: a monumental white marble mosque with one very large central dome (fibreglass, pale grey-white, slightly ribbed), symmetrical, with two tall slender minarets, arched colonnades along the facade, wide stone forecourt and trimmed palm trees, soft warm sky. Respectful, calm, exterior only, nobody in the frame." + NOTXT,
    used=False, note="NOT USED: reads as a generic Gulf mosque, not clearly the Al Fateh Grand Mosque (the real building is far larger and wider); dropped rather than risk misrepresenting a place of worship")
add("lm_durrat", "image", GPT, "026b33d5-df1b-44ac-9f76-5e7fdb8ff51f", "hf_20261115_115822_026b33d5-df1b-44ac-9f76-5e7fdb8ff51f.png",
    "Photorealistic aerial drone photograph of a luxury artificial-island resort community in the Arabian Gulf off Bahrain, in the style of Durrat Al Bahrain: an archipelago of curved crescent-shaped residential islands and a larger fish-shaped island in turquoise shallow water, rows of white villas and low apartment blocks along the shorelines, small marinas with boats, palm-lined roads, a causeway connecting to the mainland. Clear morning light." + NOTXT,
    note="Generic crescent-island resort aerial 'in the style of'; a generic illustration, not claimed to be the real project, never labelled with its name on screen")
add("lm_tree", "image", GPT, "cedf6582-8955-4768-b445-d2ff029f98b1", "hf_20261115_115822_cedf6582-8955-4768-b445-d2ff029f98b1.png",
    "Photorealistic documentary film still in the Bahrain desert at late afternoon: the Tree of Life, exactly as in reality: one single very old, wide, rounded mesquite tree with a dense green canopy standing completely alone on a small low sandy rise in flat open pale desert, nothing else around, a few dry shrubs, long soft shadow, hazy warm sky. Calm, enduring, rooted. 35mm motion-picture film look, subtle film grain. No people, no text, no signs, no logos, no watermark.",
    note="Landmark, accepted (lone mesquite on a sandy rise); shown without a name")
add("lm_bluehour", "image", GPT, "60f66697-6ebc-43d9-8919-3d39c0ed14ed", "hf_20261115_115822_60f66697-6ebc-43d9-8919-3d39c0ed14ed.png",
    "Photorealistic documentary film still at blue hour, Manama, Bahrain: the Bahrain World Trade Center and the modern skyline of Manama seen from a quiet corniche, with the sail-shaped twin towers glowing, three wind turbines between them, a few modern towers on either side, reflections in the bay, a calm wide shot with a lot of sky. 35mm motion-picture film look, subtle film grain. No text, no signs, no logos, no watermark, no flags, nobody in the foreground.",
    note="Landmark (BWTC + skyline), accepted")

S = " Photorealistic documentary film still, 35mm film look, subtle film grain."
STILLS = [
    ("n_euro", "7394c896-7a2f-497f-a54e-44eb72961b1e", "hf_20261115_115838_7394c896-7a2f-497f-a54e-44eb72961b1e.png", False,
     "Inside a bright clean modern furniture factory: a large European-style beam saw cutting a tall stack of white and oak melamine boards, a hall of advanced grey and white machines in the background, polished floor with yellow safety lines, a Gulf Arab machine operator in a white hard hat, safety glasses and hi-vis vest at a control desk. The machines are plain with no brand names. Photorealistic documentary film still, 35mm anamorphic cinema look, subtle film grain. No text, no lettering, no logos, no watermark.",
     "NOT USED: the operator stands very close to the exposed saw blade (a safety officer would object); the beam-saw beat uses the v1 CNC clip instead"),
    ("n_sketch", "40dbba6d-747c-46c5-aba9-3a6394babcb7", "hf_20261115_115906_40dbba6d-747c-46c5-aba9-3a6394babcb7.png", True,
     "Extreme close-up from above of a carpenter's pencil drawing a single long straight line on yellowed paper; the line has just begun to turn into the outline of a factory building with a saw-tooth roof, a steel ruler and pencil shavings, warm window light from the left, worn wooden bench. Only lines, no readable writing. Photorealistic documentary film still, 35mm film look, subtle grain. No text, no logos, no watermark.", "Opening frame ('a line on paper')"),
    ("n_port", "5e4b4936-49ae-4577-bb58-f6c2d89c7bc4", "hf_20261115_115905_5e4b4936-49ae-4577-bb58-f6c2d89c7bc4.png", True,
     "A container port seen at dawn during a global supply-chain slowdown: tall gantry cranes standing idle along an almost empty quay, tall stacks of plain unmarked steel shipping containers in muted rust, grey and blue, a few trucks waiting in a long queue, hazy cold light, quiet and tense mood, nobody in sight. Containers have no markings, no logos, no readable text. Photorealistic documentary film still, 35mm film look, subtle film grain. No text, no watermark.", "Start frame of v7_port"),
    ("n_ships", "e1fc45b9-02a2-4961-af88-74c7fbaa7e02", "hf_20261115_115906_e1fc45b9-02a2-4961-af88-74c7fbaa7e02.png", True,
     "Aerial view of many large cargo ships waiting at anchor in a calm grey-blue sea off a Gulf port in hazy morning light, loaded with plain unmarked containers, the port and its cranes faint on the horizon, a sense of delay and waiting. No markings, no logos, no readable text. Photorealistic documentary film still, 35mm film look, subtle film grain.", ""),
    ("n_shelves", "543a274e-1a9b-496e-9d24-a244d5dac66f", "hf_20261115_115906_543a274e-1a9b-496e-9d24-a244d5dac66f.png", True,
     "Inside a large warehouse of a furniture manufacturer with half-empty tall steel racking, a few pallets of boards, one lonely forklift parked idle, an empty clean epoxy floor with yellow lane lines, cold dim light through high windows, a feeling of shortage and waiting, nobody present. Plain, no signage. Photorealistic documentary film still, 35mm film look, subtle film grain. No text, no logos, no watermark.", ""),
    ("n_site", "df7eca3c-f285-48c2-9f67-fe7d3f201ffd", "hf_20261115_115912_df7eca3c-f285-48c2-9f67-fe7d3f201ffd.png", True,
     "The steel frame and first white cladding panels of a large new factory building under construction on flat land in Bahrain at golden hour, a crane, stacks of steel beams, a few distant workers in hard hats and hi-vis vests, warm light, a hopeful beginning, the Arabian Gulf and a hazy skyline very far in the background. No signage. Photorealistic documentary film still, 35mm anamorphic cinema look, subtle film grain. No text, no logos, no watermark.", "The birth of Yas Factory (an invented site, not a real photograph)"),
    ("n_press", "7a9b410e-aa87-4a5f-91c8-c688fb18d044", "hf_20261115_115913_7a9b410e-aa87-4a5f-91c8-c688fb18d044.png", True,
     "A long modern wood-panel pressing and lamination line in a bright factory: large flat-bed hot press, roller conveyors carrying wood-grain laminated boards, a stack of finished oak and walnut panels at the end, a Gulf Arab operator in white hard hat, safety glasses and hi-vis vest watching a control panel, clean warm light, deep perspective. Plain grey machines with no brand names. Photorealistic documentary film still, 35mm anamorphic cinema look, subtle film grain. No text, no lettering, no logos, no watermark.", "Start frame of v4_press"),
    ("n_clad", "bf960ef5-207c-4ab1-a2ad-620a25f45248", "hf_20261115_115912_bf960ef5-207c-4ab1-a2ad-620a25f45248.png", True,
     "Macro close-up of a decorative wood-grain laminate sheet being pressed and bonded onto a board between steel rollers, a thin glossy adhesive line, fine sawdust and warm light, rich oak grain, extreme shallow depth of field, precise industrial craft. Photorealistic documentary film still, subtle film grain. No text, no logos, no watermark.", "Cladding"),
    ("n_export", "33c8ab40-3d74-4530-a61d-5e730db5993f", "hf_20261115_115913_33c8ab40-3d74-4530-a61d-5e730db5993f.png", True,
     "At dusk at the gate of a modern factory in Bahrain, a flatbed truck and a forklift loading plain unmarked shipping containers with wrapped stacks of wood panels, warm light from the factory bays, a few workers in hard hats and hi-vis vests, a sense of departure to export markets. No markings, no logos, no readable text. Photorealistic documentary film still, 35mm anamorphic cinema look, subtle film grain.", ""),
    ("n_swatch", "5c79482c-e78d-4aa3-9fa2-090da3920ecd", "hf_20261115_120025_5c79482c-e78d-4aa3-9fa2-090da3920ecd.png", True,
     "Top-down view of a designer's table covered with a large fan and grid of panel finish samples: many wood grains (oak, walnut, ash), matte graphite, stone white, taupe, sage, bronze and warm sand colours, neatly arranged, a pencil and a steel ruler, soft daylight. Samples are blank, no readable text or codes. Photorealistic product-documentary film still, subtle film grain. No text, no logos, no watermark.", "Exclusive designs and colours"),
    ("n_profiles", "955cc228-8349-4c0f-b7c8-ba618c9130ad", "hf_20261115_120027_955cc228-8349-4c0f-b7c8-ba618c9130ad.png", True,
     "On a workbench in a design office, a group of extruded aluminium cabinet handle profiles of different cross-section shapes in brushed silver, black and bronze anodised finishes, beside a hand-drawn technical cross-section drawing (lines and dimension lines only, no readable writing) and a digital caliper, soft side light, shallow depth of field, precise engineering feel. Photorealistic product-documentary film still, subtle film grain. No text, no logos, no watermark.", "Aluminium profiles (generic, not the patented designs)"),
    ("n_profile_macro", "2027137b-1027-401e-be74-8be0cf5db364", "hf_20261115_120028_2027137b-1027-401e-be74-8be0cf5db364.png", True,
     "Macro close-up of the end face of an extruded aluminium profile showing its precise cross-section with channels and a thin lip, brushed metal catching a warm light, a second profile blurred behind, very shallow depth of field. Photorealistic product-documentary film still, subtle film grain. No text, no logos, no watermark.", "Under the '27+' patent count"),
    ("n_signing", "4d97f6af-0149-40dd-bd6a-a1f6d9f28025", "hf_20261115_120025_4d97f6af-0149-40dd-bd6a-a1f6d9f28025.png", True,
     "Close-up of two hands signing a document with a fountain pen on a polished walnut table, a leather folder and a glass of water beside it, a second hand resting beside the paper; the paper shows only abstract lines, no readable writing; through a tall window behind, softly out of focus, a modern waterfront skyline at golden hour. No faces visible. Photorealistic documentary film still, 35mm film look, subtle film grain. No text, no logos, no watermark.", "Shown cropped to the hands (the blurred skyline behind is generic)"),
    ("n_wide", "50af0037-52a6-429a-abf5-977d3a124ac6", "hf_20261115_120028_50af0037-52a6-429a-abf5-977d3a124ac6.png", True,
     "Very wide interior view of a huge modern furniture and wood-panel factory hall, several long parallel production lines with conveyors and machines receding into the distance, tall stacks of finished panels on pallets, bright skylights with shafts of light, a few tiny workers in hard hats and hi-vis vests for scale, spotless floor with yellow lines. Plain machines, no brand names, no signage. Photorealistic documentary film still, 35mm anamorphic cinema look, subtle film grain. No text, no lettering, no logos, no watermark.", "The stage-direction beat: wide factory and capacity"),
    ("n_products", "a672f5c2-abdd-4480-a979-0d66e606653b", "hf_20261115_120028_a672f5c2-abdd-4480-a979-0d66e606653b.png", True,
     "Finished product details in the packing area of a wood-panel factory: a neat stack of lacquered matte cabinet doors in warm walnut, stone white and graphite with perfect edges, corner protectors, wrapped pallets of oak-veneer panels, close view with shallow depth of field and a bright clean light, a gloved hand smoothing the film on one panel. Plain, blank labels, no readable text, no logos. Photorealistic documentary film still, subtle film grain.", ""),
    ("n_marassi", "faa7abf8-87e0-4caa-a6d1-2a69dddbf82e", "hf_20261115_120721_faa7abf8-87e0-4caa-a6d1-2a69dddbf82e.png", True,
     "A generic modern waterfront promenade and marina in Bahrain at golden hour: a curved seaside walkway with palm trees, a small marina with white yachts, a row of contemporary mid-rise residential towers with warm lit balconies, a calm turquoise bay, a few people strolling far away. Architectural photograph, straight verticals. No signage, no logos, no readable text, no flags. Photorealistic documentary film still, 35mm film look, subtle film grain.", "GENERIC waterfront shown while the narration says 'Marassi Al Bahrain'; not the real project"),
    ("n_waterbay", "41aa0410-a176-4e80-9b79-2f8fcc5e5733", "hf_20261115_120722_41aa0410-a176-4e80-9b79-2f8fcc5e5733.png", True,
     "Aerial view of a generic modern waterfront residential development on the coast of Bahrain at blue hour: contemporary apartment buildings stepping down to a lit seafront, a quay with a canal-like water inlet, palm-lined streets, glowing windows, calm sea reflecting the sky. No signage, no logos, no readable text, no flags. Photorealistic documentary film still, 35mm film look, subtle film grain.", "GENERIC waterfront shown while the narration says 'Water Bay'; not the real project"),
    ("n_housing", "8baefc8e-172d-4ba3-9de3-7a9a2b81278c", "hf_20261115_120721_8baefc8e-172d-4ba3-9de3-7a9a2b81278c.png", True,
     "Aerial view in warm afternoon light of a large planned government housing neighbourhood in Bahrain: tidy rows of two-storey sand-coloured family houses with flat roofs, small gardens, wide paved streets, a mosque-free low-rise community centre and a playground, palm trees, a pale sky. Generic, no signage, no logos, no readable text, no flags. Photorealistic documentary film still, 35mm film look, subtle film grain.", "GENERIC housing neighbourhood for 'government housing projects'"),
    ("n_detail", "92f73161-8100-46c1-94f5-021d859821f5", "hf_20261115_120722_92f73161-8100-46c1-94f5-021d859821f5.png", True,
     "Close detail shot of finished kitchen cabinet doors and drawer fronts in matte graphite, warm walnut and stone white, edges perfectly banded, a slim brushed bronze aluminium handle profile, a soft-close hinge, shallow depth of field, clean warm light, an immaculate finished-product feeling. No text, no logos, no brand names. Photorealistic product-documentary film still, subtle film grain.", "Finished product detail (stage direction)"),
]
for key, job, f, used, prompt, note in STILLS:
    add(key, "image", SEED, job, f, prompt, used=used, note=note)

VIDEO = dict(model="kling2_6", params={"aspect_ratio": "16:9", "duration": 5, "sound": False}, credits=5.0)
add("v4_press", "video", VIDEO, "7fef840c-e7c9-401a-b694-2f7e4458a3a2", "hf_20261115_120106_7fef840c-e7c9-401a-b694-2f7e4458a3a2.mp4",
    "Slow smooth dolly forward along the wood-panel pressing line: laminated oak and walnut boards glide steadily along the roller conveyor out of the press, the operator in white hard hat and hi-vis vest watches the control panel and nods slightly, dust motes drift in the light from the high windows. Realistic industrial documentary footage, steady, sharp, the machines keep their exact shape, no morphing, no text, no logos.",
    start_image="n_press", start_image_job_id="7a9b410e-aa87-4a5f-91c8-c688fb18d044")
add("v5_causeway", "video", VIDEO, "fb8126da-2b23-4280-9445-8126de573cda", "hf_20261115_120108_fb8126da-2b23-4280-9445-8126de573cda.mp4",
    "Slow, smooth aerial drone flight gliding forward along the causeway towards the island with the tall tower, the sun low on the left glittering on the water, a few cars drive steadily along the road. Steady cinematic drone footage, realistic, the bridge, island and tower keep their exact shape, no morphing, no text, no logos.",
    start_image="lm_causeway", start_image_job_id="b754116e-f3ac-440e-a656-2330797e1a22")
add("v6_dawn", "video", VIDEO, "25562610-412d-4d17-88d6-8663b3499759", "hf_20261115_120110_25562610-412d-4d17-88d6-8663b3499759.mp4",
    "Very slow gentle push-in across the calm bay at dawn: the moored wooden dhow rocks very slightly, ripples drift across the water and the sunrise glow brightens, the skyline and the two sail-shaped towers in the distance stay perfectly still. Cinematic documentary, steady, the buildings and towers keep their exact shape, no morphing, no text, no logos.",
    start_image="lm_dawn", start_image_job_id="23bef50f-94fb-466e-9bf2-0c7250d2372d",
    note="The towers in the moving shot read slightly more curved than in the still; still the BWTC silhouette (two sails, three turbines)")
add("v7_port", "video", VIDEO, "f01804d6-f992-4f30-af38-30127f985f2e", "hf_20261115_120111_f01804d6-f992-4f30-af38-30127f985f2e.mp4",
    "Slow track forward through the quiet container port at dawn: cold mist drifts between the tall stacks of containers, the idle gantry cranes loom, the queue of trucks waits without moving, a sense of stillness and delay. Realistic documentary footage, steady, nothing morphs, no text, no logos.",
    start_image="n_port", start_image_job_id="5e4b4936-49ae-4577-bb58-f6c2d89c7bc4")
add("narration2", "audio", dict(model="text2speech_v2", params={"variant": "elevenlabs", "voice_type": "preset", "voice_id": "d9d5c263-f84e-4752-97b5-3750fcc6fd2f", "voice_name": "Alistair"}, credits=5.55),
    "cb43212e-5a44-4c32-8bcd-31c5022ea92c", "hf_20261115_115635_cb43212e-5a44-4c32-8bcd-31c5022ea92c.mp3",
    "(the 34 narrated lines of the owner's script, one per line, no stage direction; see journey2_script.py LINES)",
    note="One continuous read, 205.2 s, same voice as film v1. Transcribed with faster-whisper medium: 291 words, the script has 291; every line matched")
add("music2", "audio", dict(model="elevenlabs_music_v2", params={"duration": 228, "force_instrumental": True}, credits=14.58),
    "50ef0d94-ada8-4acd-9cbb-7d142acd085a", "hf_20261115_120119_50ef0d94-ada8-4acd-9cbb-7d142acd085a.mp3",
    "Instrumental cinematic documentary underscore for a heritage-to-industry film about a craftsman's small workshop in Bahrain that grows into a modern manufacturer with an investment call at the end. Dignified, emotional, hopeful, never bombastic, leaves clear space for a narrator throughout. 0:00-0:35 intimate and nostalgic: solo oud and soft felt piano over a warm sustained string pad, slow tempo. 0:35-1:15 the dream grows: gentle pulsing strings, soft frame drum, a rising hopeful motif, steadily building energy. 1:15-1:40 a tense, reflective passage: music pulls back to low sustained strings and sparse piano, a sense of uncertainty, then a quiet turn toward hope. 1:40-2:25 the new factory and expansion: confident, forward-moving, subtle electronic pulse, light percussion, brighter strings and qanun colours, steady momentum. 2:25-3:05 the new chapter and the digital system: modern, clear, optimistic, layered arpeggios and strings, a restrained build. 3:05-3:35 the investment call: uplifting and proud, the full orchestra swells to a warm climax. 3:35-3:48 resolves on a long sustained final chord that fades out gently. Blend of subtle Gulf colours (oud, qanun) with a modern documentary orchestra. No vocals, no choir, no lyrics.",
    note="228 s. Chosen over extending the v1 bed (128 s) for a bed that builds to the investment close and resolves; the 4 s of final-chord tail after the film's end are faded out")

total = round(sum(i["credits"] for i in ITEMS), 2)
NO_PHOTO_NOTE = "No Higgsfield call received the two leaders' photographs: none was uploaded, referenced or used as a character element."
out = {"note": "Ledger of every Higgsfield generation made for film v2 (journey2-*). " + NO_PHOTO_NOTE + " The stills and clips re-used from v1 are in generations.json (no new charge). Result URLs are on the Higgsfield CDN: re-download instead of regenerating (scripts/showroom3d-film/fetch_sources2.py).",
       "account": {"plan": "plus", "credits_before": 1000.0, "unlimited_allowance": False},
       "credits_total_by_ledger": total, "cap": 150, "items": ITEMS}
here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(here, "..", "..", "docs", "showroom3d", "film-src")
json.dump(out, open(os.path.join(dest, "journey2-ledger.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

lines = ["# Film v2 credits ledger (Higgsfield)", "", "Generated by `scripts/showroom3d-film/gen_ledger2.py` from the same data as `journey2-ledger.json`. " + NO_PHOTO_NOTE, "",
         "| Key | Kind | Model | Params | Credits | Job id | Used | Note |", "|---|---|---|---|---|---|---|---|"]
for i in ITEMS:
    lines.append("| `%s` | %s | %s | %s | %.2f | `%s` | %s | %s |" % (i["key"], i["type"], i["model"], json.dumps(i["params"]), i["credits"], i["job_id"], "yes" if i["used_in_film"] else "**no**", i.get("note", "")))
lines += ["", "**Total by ledger: %.2f credits** (cap 150). Every quote was taken with `get_cost` before generating and equalled the charge in `transactions`." % total, "",
          "## Prompts", ""]
for i in ITEMS:
    lines += ["### `%s`%s" % (i["key"], (" (job `%s`)" % i["job_id"])), "", i["prompt"], ""]
open(os.path.join(dest, "journey2-ledger.md"), "w", encoding="utf-8").write("\n".join(lines))
print("ledger total", total, "items", len(ITEMS))
