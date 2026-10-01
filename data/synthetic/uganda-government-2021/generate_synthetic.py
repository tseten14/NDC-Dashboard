#!/usr/bin/env python3
"""Generate synthetic observations only; Python standard library, fixed seed."""
import argparse, csv, hashlib, json, math, random
from pathlib import Path
SEED = 20211001
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent

def num(x): return float(x)
def fmt(x):
    # Reference export uses approximately ten significant digits, including E notation.
    return format(x, '.10g').replace('e', 'E') if x else '0'
def inside_ring(x, y, ring):
    hit = False
    for a,b in zip(ring, ring[1:]+ring[:1]):
        if (a[1]>y)!=(b[1]>y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]: hit = not hit
    return hit
_DISTRICT_CACHE = {}
def district(row, features):
    x,y=num(row['longitude']),num(row['latitude'])
    key=(x,y)
    if key in _DISTRICT_CACHE: return _DISTRICT_CACHE[key]
    names=[]
    for f in features:
        g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        if any(min(a[0] for a in p[0]) <= x <= max(a[0] for a in p[0]) and min(a[1] for a in p[0]) <= y <= max(a[1] for a in p[0]) and inside_ring(x,y,p[0]) and not any(inside_ring(x,y,h) for h in p[1:]) for p in polys): names.append(f['properties']['shapeName'])
    result='|'.join(sorted(set(names))) or 'UNRESOLVED'
    _DISTRICT_CACHE[key]=result
    return result
def facility(r):
    return 'point:'+r['latitude']+','+r['longitude'] if r['source_type']=='point-source' else 'area-source:'+r['source_id']
def scaled(r, ratio, ef_ratio=1):
    out=r.copy()
    e=num(r['emissions_tco2e'])*ratio
    a=num(r['activity'])*ratio/ef_ratio
    ef=num(r['emissions_factor'])*ef_ratio
    out.update(emissions_tco2e=fmt(e),emissions_mtco2e=fmt(e/1e6),activity=fmt(a),emissions_factor=fmt(ef))
    # Preserve each subsector's existing capacity semantics; rescale its observed ratio.
    out['capacity_factor']=fmt(num(r['capacity_factor'])*ratio/ef_ratio)
    return out

def main():
    ap=argparse.ArgumentParser();ap.add_argument('reference',type=Path);args=ap.parse_args()
    raw=args.reference.read_bytes(); dialect=csv.Sniffer().sniff(raw.decode('utf-8-sig')[:12000])
    with args.reference.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f); fields=reader.fieldnames; allrows=list(reader)
    rows=[r for r in allrows if r['year']=='2021']
    assert len(fields)==len(set(fields)) and rows
    assert len({(r['source_id'],r['year'],r['gas']) for r in rows})==len(rows)
    assert all(r['gas']=='co2e_100yr' for r in rows)
    rng=random.Random(SEED)
    geo=ROOT/'backend/services/translator/uganda-districts.geojson'
    features=json.loads(geo.read_text())['features']
    pointgroups=sorted({facility(r) for r in rows if r['source_type']=='point-source'})
    # Omit two small domestic aviation facilities, retaining every related record as one case.
    omitted={facility(r) for r in rows if r['source_name'] in ('Savannah Airstrip','Kisoro Airport')}
    target=round(len(pointgroups)*1.2); add_count=target-len(pointgroups)+len(omitted)
    point_high=next(facility(r) for r in rows if r['source_name']=='Bidco Uganda Limited')
    point_low=next(facility(r) for r in rows if r['source_name']=='Tororo power station')
    area=[r for r in rows if r['source_type']=='gadm-aggregation']
    eligible=[r for r in area if num(r['emissions_tco2e'])!=0]
    rng.shuffle(eligible)
    challenge_count=round(len(area)*.25)
    chosen=eligible[:challenge_count]; chosenids={r['source_id'] for r in chosen}
    # Half of area challenges reflect systematically undercounted activity; half lower estimates.
    ordered=sorted(chosen,key=lambda r:(r['sector']=='forestry-and-land-use',-abs(num(r['emissions_tco2e']))))
    highids={r['source_id'] for r in ordered[:round(challenge_count*.55)]}
    lowids=chosenids-highids
    records=[]; register=[]; high_entries=[]
    for r in rows:
        fid=facility(r); status='omitted' if fid in omitted else 'matched'
        case='normal'; issue='ordinary_estimation_variation'; ratio=rng.uniform(.91,1.10)
        # Larger sources use narrower ordinary variation; sector affects spread.
        if abs(num(r['emissions_tco2e']))>100000: ratio=rng.uniform(.94,1.08)
        if r['sector']=='forestry-and-land-use': ratio=rng.uniform(.88,1.12)
        if status=='omitted': case='challenging';issue='coverage_omission'
        elif fid==point_high or r['source_id'] in highids: case='challenging';issue='higher_activity_estimate';ratio=rng.uniform(1.7,2.2)
        elif fid==point_low or r['source_id'] in lowids: case='challenging';issue='lower_activity_estimate';ratio=rng.uniform(.45,.72)
        ef_ratio=rng.uniform(.985,1.015) if num(r['emissions_factor']) else 1
        out=scaled(r,ratio,ef_ratio)
        out['district']=district(out,features)
        out['api_version']=''
        out['api_endpoint']=''
        out['extracted_at_utc']='2026-10-01T00:00:00Z'
        entry={'source_id':r['source_id'],'facility_case_id':fid,'observation_type':r['source_type'],'coverage':status,'case':case,'situation':issue,'district_from_coordinates':district(r,features),'district_basis':'local ADM2 polygon; area centroid does not establish full county membership','generation_assumption':f'activity scale {ratio:.8f}; factor scale {ef_ratio:.8f}; capacity semantics retained','template_source_id':r['source_id']}
        register.append(entry)
        if status!='omitted':
            records.append(out)
            if issue=='higher_activity_estimate' and r['sector']!='forestry-and-land-use': high_entries.append((r,out,entry,ef_ratio,ratio))
    # Add modest-scale, wholly invented manufacturing/waste facilities, never duplicate area aggregates.
    templates=[r for r in rows if r['source_type']=='point-source' and r['subsector'] in ('food-beverage-tobacco','pulp-and-paper','solid-waste-disposal') and district(r,features)!='UNRESOLVED']
    used={r['source_id'] for r in allrows}
    for i in range(add_count):
        t=templates[i%len(templates)]; ratio=rng.uniform(.20,.65); out=scaled(t,ratio)
        sid=str(98000001+i);assert sid not in used;used.add(sid)
        # Sample close to an existing appropriate industrial location, validating polygon membership.
        for attempt in range(1000):
            out['latitude']=fmt(num(t['latitude'])+rng.uniform(-.012,.012));out['longitude']=fmt(num(t['longitude'])+rng.uniform(-.012,.012))
            if district(out,features)==district(t,features): break
        else: raise AssertionError('No valid invented location')
        out['source_id']=sid
        out['capacity']=fmt(num(t['capacity'])*ratio)
        out['capacity_factor']=t['capacity_factor']
        out['district']=district(out,features)
        facility_type={'food-beverage-tobacco':'food processing plant','pulp-and-paper':'paper mill','solid-waste-disposal':'municipal waste site'}[t['subsector']]
        out['source_name']=f'Synthetic {out["district"]} {facility_type} {i+1:02d}'
        out['api_version']=''
        out['api_endpoint']=''
        out['extracted_at_utc']='2026-10-01T00:00:00Z'
        records.append(out)
        register.append({'source_id':sid,'facility_case_id':'invented:'+sid,'observation_type':'point-source','coverage':'additional','case':'challenging','situation':'invented_additional_facility','district_from_coordinates':district(out,features),'district_basis':'local ADM2 polygon; sampled inside template district','generation_assumption':f'Wholly invented {t["subsector"]}; template activity and capacity scaled {ratio:.8f}; coordinates are fictional','template_source_id':t['source_id']})
    # Target one coherent positive scope, excluding all potentially overlapping LULUCF components.
    scope=lambda r:r['sector']!='forestry-and-land-use'
    baseline=sum(num(r['emissions_tco2e']) for r in rows if scope(r))
    target_emissions=baseline*1.25
    current=sum(num(r['emissions_tco2e']) for r in records if scope(r))
    weight=sum(num(r['emissions_tco2e'])*ratio for r,o,e,ef,ratio in high_entries)
    adjustment=1+(target_emissions-current)/weight
    assert high_entries and adjustment>0
    for r,out,entry,ef,ratio in high_entries:
        finalratio=ratio*adjustment
        assert 1.5<=finalratio<=3.5, ('Implausible target adjustment',finalratio)
        final_values=scaled(r,finalratio,ef)
        out.update({k: final_values[k] for k in ('emissions_tco2e','emissions_mtco2e','activity','emissions_factor','capacity_factor')})
        entry['generation_assumption']=f'activity scale {finalratio:.8f}; factor scale {ef:.8f}; bounded high-estimate allocation toward generation target'
    OUT.mkdir(parents=True,exist_ok=True)
    dest=OUT/'uganda_government_synthetic_2021.csv'
    output_fields=[fields[0], 'district', *fields[1:]]
    with dest.open('w',encoding='utf-8-sig' if raw.startswith(b'\xef\xbb\xbf') else 'utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=output_fields,dialect=dialect,lineterminator='\r\n' if b'\r\n' in raw else '\n');writer.writeheader();writer.writerows(records)
    with dest.open(newline='') as f:
        reader=csv.DictReader(f);assert reader.fieldnames==output_fields; check=list(reader)
    assert len({(r['source_id'],r['year'],r['gas']) for r in check})==len(check)
    assert all(r['year']=='2021' and r['country']=='UGA' and r['coordinate_srid']=='4326' for r in check)
    numeric=['latitude','longitude','emissions_tco2e','emissions_mtco2e','emissions_factor','activity','capacity','capacity_factor']
    originals={r['source_id']:r for r in rows};entries={r['source_id']:r for r in register}
    residuals=[]
    for r in check:
        assert all(math.isfinite(num(r[k])) for k in numeric)
        assert math.isclose(num(r['emissions_mtco2e']),num(r['emissions_tco2e'])/1e6,rel_tol=2e-9,abs_tol=1e-12)
        entry=entries[r['source_id']]
        assert r['district']==district(r,features) and r['district']!='UNRESOLVED'
        assert r['api_version']=='' and r['api_endpoint']=='' and r['extracted_at_utc']=='2026-10-01T00:00:00Z'
        if entry['coverage']=='matched':
            ref=originals[r['source_id']]
            assert all(r[k]==ref[k] for k in ('source_name','latitude','longitude','sector','subsector','source_type','asset_type','activity_units','capacity_units','emissions_factor_units'))
            # Preserve original rounded residual instead of assuming all reference formulas are exact.
            a,e,ef=num(ref['activity']),num(ref['emissions_tco2e']),num(ref['emissions_factor'])
            if a*ef:
                old=e/(a*ef);new=num(r['emissions_tco2e'])/(num(r['activity'])*num(r['emissions_factor']))
                assert math.isclose(old,new,rel_tol=5e-8)
                residuals.append(abs(old-1))
        else: assert entry['district_from_coordinates']!='UNRESOLVED'
    physical_cases={e['facility_case_id']:e['case'] for e in register if e['observation_type']=='point-source'}
    # All related physical-facility records must share coverage and scenario.
    for fid in physical_cases:
        related=[e for e in register if e['facility_case_id']==fid]
        assert len({(e['coverage'],e['case'],e['situation']) for e in related})==1
    normal_nonzero=[r for r in check if entries[r['source_id']]['case']=='normal' and num(originals[r['source_id']]['emissions_tco2e'])!=0]
    normal_up=sum(num(r['emissions_tco2e'])>num(originals[r['source_id']]['emissions_tco2e']) for r in normal_nonzero)
    assert 0<normal_up<len(normal_nonzero)
    physical_challenging=sum(v=='challenging' for v in physical_cases.values())/len(physical_cases)
    area_challenging=len(chosenids)/len(area)
    assert .2<=physical_challenging<=.3 and .2<=area_challenging<=.3
    assert abs(sum(num(r['emissions_tco2e']) for r in check if scope(r))/baseline-1.25)<1e-8
    assert len(pointgroups)==43 and len(omitted)==2 and len({r['source_id'] for r in check if r['source_type']=='point-source'})==55
    summary={'seed':SEED,'reference_sha256':hashlib.sha256(raw).hexdigest(),'district_geojson_sha256':hashlib.sha256(geo.read_bytes()).hexdigest(),'reference_2021_rows':len(rows),'synthetic_rows':len(check),'reference_physical_point_facilities':len(pointgroups),'synthetic_physical_point_facilities':target,'added_facilities':add_count,'omitted_facilities':len(omitted),'physical_facility_challenging_fraction':physical_challenging,'area_source_challenging_fraction':area_challenging,'normal_nonzero_higher_count':normal_up,'normal_nonzero_lower_count':len(normal_nonzero)-normal_up,'generation_scope':'2021 co2e_100yr; all non-forestry-and-land-use observations; tCO2e only','generation_scope_ratio':sum(num(r['emissions_tco2e']) for r in check if scope(r))/baseline,'max_retained_reference_formula_relative_residual':max(residuals),'unresolved_matched_district_observations':sum(e['district_from_coordinates']=='UNRESOLVED' for e in register if e['coverage']=='matched'),'checks':'PASS: district second; original columns retained; observation keys, year, finite numbers, t/Mt agreement, matched classifications and units, related facility records, district geometry, reference formula residuals, case balance, normal variation, coverage, scoped target'}
    print(json.dumps(summary,indent=2))
if __name__=='__main__': main()
