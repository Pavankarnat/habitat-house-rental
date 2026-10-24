import os, sys
from datetime import date, timedelta
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_password
from app.logic import aqi_category

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    sample_localities = [
        # (name, city, desc, conn, base_rate, base_rent_2bhk, avg_price_target, aqi, amenities)
        ("Kukatpally", "Hyderabad", "Established residential and commercial hub with excellent metro connectivity, shopping malls, and vibrant markets.", 5, 6800, 24000, 7790000, 118, [
            ("KIMS Cuddles Hospital", "Hospital"), ("Forum Sujana Mall", "Market"), ("JNTU Metro Station", "Transport"), ("Kukatpally Lake Park", "Park"), ("DAV Public School", "School")
        ]),
        ("Miyapur", "Hyderabad", "Rapidly growing residential sector with the terminal Red Line Metro station and family-friendly residential townships.", 4, 5900, 21000, 6990000, 110, [
            ("Pranaam Wellness Hospital", "Hospital"), ("Miyapur Metro Station", "Transport"), ("Alluri Sita Rama Raju Park", "Park"), ("Silver Oaks International School", "School")
        ]),
        ("Gachibowli", "Hyderabad", "Premier cyber corridor with modern high-rises, corporate campuses, international sports stadium, and top hospitals.", 5, 9200, 35000, 13000000, 142, [
            ("Continental Hospital", "Hospital"), ("Gachibowli Indoor Stadium", "Park"), ("Oakridge International School", "School"), ("Sarath City Capital Mall", "Market"), ("Outer Ring Road Junction", "Transport"), ("Care Hospital Gachibowli", "Hospital")
        ]),
        ("LB Nagar", "Hyderabad", "Major junction and residential gateway in East Hyderabad with metro rail terminal and budget-friendly communities.", 4, 5700, 19000, 6300000, 95, [
            ("Kamineni Hospital", "Hospital"), ("LB Nagar Metro Station", "Transport"), ("Priyadarshini Park", "Park"), ("St. Joseph Public School", "School")
        ]),
        ("Manikonda", "Hyderabad", "Favored residential suburb near Financial District and Lanco Hills, featuring modern gated complexes and commercial high streets.", 4, 7600, 27000, 9650000, 132, [
            ("Apollo Clinic Manikonda", "Hospital"), ("Puppalguda Lake Park", "Park"), ("Delhi Public School", "School"), ("Heritage Fresh Market", "Market"), ("ORR Feeder Road", "Transport")
        ]),
        ("Kompally", "Hyderabad", "Serene northern suburban enclave characterized by peaceful gated villa communities, wide avenues, and cleaner air.", 3, 5200, 17000, 5800000, 84, [
            ("Sureka Hospital", "Hospital"), ("Cineplanet Complex", "Market"), ("Kompally Urban Forest", "Park"), ("St. Ann's High School", "School")
        ]),
        ("Hitec City", "Hyderabad", "The beating heart of Hyderabad's technology boom, iconic commercial towers, luxury apartments, and lakeside lifestyle.", 5, 9800, 38000, 14000000, 148, [
            ("Medicover Hospital", "Hospital"), ("Hitec City Metro Station", "Transport"), ("Inorbit Mall", "Market"), ("Durgam Cheruvu Cable Bridge Park", "Park"), ("Phoenix Arena Cultural Centre", "Market")
        ]),
        ("Madhapur", "Hyderabad", "Vibrant cosmopolitan neighborhood packed with cafes, IT tech parks, craft villages, and bustling residential lanes.", 5, 8800, 32000, 12000000, 138, [
            ("Apollo Cradle Hospital", "Hospital"), ("Madhapur Metro Station", "Transport"), ("Shilparamam Cultural Crafts Village", "Park"), ("Ratnadeep Supermarket", "Market"), ("Manthan International School", "School")
        ]),
        ("Kondapur", "Hyderabad", "Strategic hub nestled between Hitec City and the Botanical Garden, offering high rental yields and gated towers.", 4, 8200, 30000, 11000000, 125, [
            ("KIMS Hospital Kondapur", "Hospital"), ("Kotla Vijayabhaskara Reddy Botanical Garden", "Park"), ("Chirec International School", "School"), ("AMB Cinemas Mall", "Market")
        ]),
        ("Financial District", "Hyderabad", "State-of-the-art master-planned business and high-rise luxury residential district in Nanakramguda.", 5, 9500, 36000, 13500000, 135, [
            ("AIG Hospitals", "Hospital"), ("WaveRock IT Complex", "Market"), ("ORR Toll Plaza", "Transport"), ("Nanakramguda Central Greens", "Park"), ("Keystone International School", "School")
        ]),
        ("Jubilee Hills", "Hyderabad", "Hyderabad's most prestigious luxury neighbourhood, home to sprawling residences, upscale boutiques, and KBR Park.", 5, 15000, 55000, 28000000, 98, [
            ("Apollo Health City", "Hospital"), ("KBR National Park", "Park"), ("Jubilee Hills Check Post Metro", "Transport"), ("Peddamma Temple Cultural Square", "Market"), ("P. Obul Reddy Public School", "School"), ("Road 36 High Street", "Market")
        ]),
        ("Banjara Hills", "Hyderabad", "Historic elite enclave with undulating tree-lined hills, luxury star hotels, prime specialty hospitals, and embassies.", 5, 14000, 50000, 24000000, 105, [
            ("Star Hospital", "Hospital"), ("GVK One Mall", "Market"), ("Jalagam Vengal Rao Park", "Park"), ("Taj Krishna Junction", "Transport"), ("Meridian School", "School")
        ]),
        ("Tellapur", "Hyderabad", "Rapidly transforming residential belt in western Hyderabad featuring expansive integrated townships and green vistas.", 4, 6500, 24000, 8500000, 89, [
            ("Tellapur Health Hub", "Hospital"), ("Manjeera Lake Promenade", "Park"), ("Glendale Academy International", "School"), ("Tellapur ORR Exit", "Transport")
        ]),
        ("Nallagandla", "Hyderabad", "Quiet residential pocket adjacent to Central University with scenic lakes, green buffers, and modern family apartments.", 4, 7200, 26000, 9200000, 92, [
            ("Citizen Hospital", "Hospital"), ("Nallagandla Lake Park", "Park"), ("Epistemo Global School", "School"), ("Ratnadeep Marketplace", "Market")
        ]),
        ("Uppal", "Hyderabad", "Prominent eastern transit center with the Rajiv Gandhi International Cricket Stadium, Metro connectivity, and affordable housing.", 4, 5600, 18500, 6200000, 102, [
            ("Aditya Hospital", "Hospital"), ("Uppal Metro Station", "Transport"), ("Rajiv Gandhi Cricket Stadium", "Park"), ("Kendriya Vidyalaya Uppal", "School")
        ]),
        ("Begumpet", "Hyderabad", "Established heritage residential and commercial hub in central Hyderabad with flyovers, metro lines, and premier clubs.", 5, 7500, 25000, 9000000, 115, [
            ("Pace Hospital", "Hospital"), ("Begumpet Metro Station", "Transport"), ("Sanjeevaiah Park", "Park"), ("Hyderabad Public School", "School"), ("Country Club Hyderabad", "Market")
        ]),
        ("Ameerpet", "Hyderabad", "Bustling central junction and educational hub featuring the major Red-Blue metro interchange and commercial markets.", 5, 6900, 22000, 7800000, 135, [
            ("Aster Prime Hospital", "Hospital"), ("Ameerpet Metro Interchange", "Transport"), ("Sarathi Studios Park", "Park"), ("Big Bazaar Ameerpet", "Market")
        ]),
        ("Dilsukhnagar", "Hyderabad", "Historic residential and retail landmark in southern Hyderabad with metro accessibility and community infrastructure.", 4, 5800, 19500, 6400000, 112, [
            ("Omni Hospital", "Hospital"), ("Dilsukhnagar Metro Station", "Transport"), ("HUDA Park Dilsukhnagar", "Park"), ("Bhashyam High School", "School")
        ]),
    ]

    # Clean existing sample localities if present, then insert the full 18 localities
    # Keep users intact!
    for loc_tuple in sample_localities:
        name, city, desc, conn, base_rate, base_rent, target_price, aqi, amenities = loc_tuple
        loc = db.query(models.Locality).filter_by(name=name).first()
        if not loc:
            loc = models.Locality(name=name, city=city, description=desc, connectivity_score=conn)
            db.add(loc)
            db.flush()
        else:
            loc.city = city
            loc.description = desc
            loc.connectivity_score = conn
            db.flush()

        # Check properties
        if not loc.properties:
            # Add 1BHK, 2BHK, 3BHK, 4BHK properties
            variants = [
                ("Apartment", 1, 650, 0.72),
                ("Apartment", 2, 1150, 1.00),
                ("Apartment", 3, 1600, 1.42),
                ("Gated Community", 3, 1850, 1.58),
                ("Villa", 4, 2800, 2.45),
            ]
            for p_type, bhk, area, factor in variants:
                calc_price = round(base_rate * area * factor, -3)
                calc_rent = round(base_rent * (bhk / 2.0) * factor / 100) * 100
                db.add(models.PropertyRecord(
                    locality_id=loc.id,
                    property_type=p_type,
                    bhk=bhk,
                    area_sqft=area,
                    price=calc_price,
                    monthly_rent=calc_rent,
                    is_sample=True
                ))

        # Check pollution readings (dated time series across 90, 60, 30, and 0 days ago)
        if not loc.readings:
            for day_offset, delta in [(90, 18), (60, 10), (30, 4), (0, 0)]:
                reading_date = date.today() - timedelta(days=day_offset)
                val = max(20, aqi + delta)
                db.add(models.PollutionReading(
                    locality_id=loc.id,
                    observation_date=reading_date,
                    pm25=round(val * 0.38, 1),
                    pm10=round(val * 0.74, 1),
                    aqi=val,
                    category=aqi_category(val),
                    is_sample=True
                ))

        # Check amenities
        if not loc.amenities:
            for a_name, a_cat in amenities:
                db.add(models.Amenity(
                    locality_id=loc.id,
                    name=a_name,
                    category=a_cat,
                    description=f"Nearby {a_cat.lower()} providing essential community convenience in {loc.name}."
                ))

    db.commit()
    print(f"Successfully seeded/verified {len(sample_localities)} Hyderabad localities with properties, pollution history, and amenities.")

    # Admin Account
    admin_email = os.getenv("ADMIN_EMAIL", "admin@housing.local")
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    admin_user = db.query(models.User).filter_by(email=admin_email).first()
    if not admin_user:
        db.add(models.User(name="Pavan", email=admin_email, password_hash=hash_password(admin_password), role="admin"))
        db.commit()
        print(f"Created admin account: {admin_email} / {admin_password}")
    else:
        # Ensure name is Pavan to match reference header avatar
        if admin_user.name != "Pavan":
            admin_user.name = "Pavan"
            db.commit()
        print(f"Admin account confirmed: {admin_email}")

finally:
    db.close()
