"""
Materials Project Microservice
FastAPI service that uses MPRester to access Materials Project data
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import sys
from typing import Optional, List

# Load environment variables
load_dotenv()

# Fix for mp-api 0.36.0 compatibility with Pydantic 2.6+
# BaseSettings was moved to pydantic-settings, but mp-api 0.36.0 still tries to import from pydantic
try:
    import pydantic_settings
    import pydantic
    # Make BaseSettings available from pydantic for backwards compatibility
    if not hasattr(pydantic, 'BaseSettings'):
        pydantic.BaseSettings = pydantic_settings.BaseSettings
        pydantic.Field = pydantic.Field  # Ensure Field is available
except ImportError:
    pass

# Import MPRester
try:
    from mp_api.client import MPRester
except ImportError as e:
    print(f"Error: mp-api not installed or not accessible.")
    print(f"Import error details: {e}")
    print(f"Python path: {sys.path}")
    print("\nPlease ensure:")
    print("1. You're in a virtual environment (venv)")
    print("2. The venv is activated")
    print("3. mp-api is installed: pip install mp-api")
    print("4. pydantic-settings is installed: pip install pydantic-settings")
    print("\nOn Windows, activate with: venv\\Scripts\\activate")
    print("On Linux/Mac, activate with: source venv/bin/activate")
    sys.exit(1)

app = FastAPI(
    title="Materials Project API Service",
    description="Microservice for accessing Materials Project data via MPRester",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get API key from environment
MP_API_KEY = os.getenv("MP_API_KEY") or os.getenv("MATERIALS_API_KEY")

if not MP_API_KEY:
    print("Warning: MP_API_KEY or MATERIALS_API_KEY not set in environment variables")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Materials Project API Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "api_key_configured": bool(MP_API_KEY)}


@app.get("/materials/{material_id}")
async def get_material(material_id: str):
    """
    Get material summary by material ID
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Material summary data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured. Set MP_API_KEY or MATERIALS_API_KEY in environment variables"
        )
    
    if not material_id.startswith("mp-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid material ID format. Material IDs should start with 'mp-'"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            # Search for material by ID
            # Note: Use 'nsites' and 'nelements' instead of 'num_sites' and 'num_elements'
            docs = mpr.materials.summary.search(
                material_ids=[material_id],
                fields=[
                    "material_id",
                    "formula_pretty",
                    "formula_anonymous",
                    "structure",
                    "density",
                    "density_atomic",
                    "symmetry",
                    "formation_energy_per_atom",
                    "energy_above_hull",
                    "band_gap",
                    "is_gap_direct",
                    "is_metal",
                    "is_magnetic",
                    "total_magnetization",
                    "nsites",  # Correct field name
                    "nelements",  # Correct field name
                    "elements",
                    "energy_per_atom",
                    "volume",
                    "is_stable",
                ]
            )
            
            if not docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Material {material_id} not found"
                )
            
            # Convert document to dict
            # MPRester returns documents with attributes, convert to dict safely
            doc = docs[0]
            material_data = {}
            
            # Helper function to safely get attribute
            def get_attr(obj, attr, default=None):
                try:
                    value = getattr(obj, attr, default)
                    # Convert to native Python types
                    if value is not None:
                        if hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
                            try:
                                return list(value) if not isinstance(value, dict) else value
                            except:
                                return str(value)
                    return value
                except:
                    return default
            
            # Basic properties
            material_data["material_id"] = str(get_attr(doc, 'material_id', ''))
            material_data["formula_pretty"] = get_attr(doc, 'formula_pretty')
            material_data["formula_anonymous"] = get_attr(doc, 'formula_anonymous')
            material_data["density"] = get_attr(doc, 'density')
            material_data["density_atomic"] = get_attr(doc, 'density_atomic')
            # Use correct field names: nsites and nelements
            material_data["num_sites"] = get_attr(doc, 'nsites')  # Map nsites to num_sites for frontend compatibility
            material_data["num_elements"] = get_attr(doc, 'nelements')  # Map nelements to num_elements for frontend compatibility
            material_data["elements"] = get_attr(doc, 'elements', [])
            material_data["nelements"] = get_attr(doc, 'nelements')
            material_data["nsites"] = get_attr(doc, 'nsites')
            material_data["energy_per_atom"] = get_attr(doc, 'energy_per_atom')
            material_data["volume"] = get_attr(doc, 'volume')
            material_data["formation_energy_per_atom"] = get_attr(doc, 'formation_energy_per_atom')
            material_data["energy_above_hull"] = get_attr(doc, 'energy_above_hull')
            material_data["band_gap"] = get_attr(doc, 'band_gap')
            material_data["is_gap_direct"] = get_attr(doc, 'is_gap_direct')
            material_data["is_metal"] = get_attr(doc, 'is_metal')
            material_data["is_magnetic"] = get_attr(doc, 'is_magnetic')
            material_data["total_magnetization"] = get_attr(doc, 'total_magnetization')
            material_data["is_stable"] = get_attr(doc, 'is_stable')
            
            # Add structure data if available
            structure = get_attr(doc, 'structure')
            if structure:
                try:
                    # Handle case where structure is a list (multiple structures)
                    if isinstance(structure, list) and len(structure) > 0:
                        structure = structure[0]  # Take the first structure
                    
                    # Convert structure to dict using pymatgen's as_dict method
                    structure_dict = None
                    if hasattr(structure, 'as_dict'):
                        try:
                            structure_dict = structure.as_dict()
                        except Exception as e:
                            print(f"Error calling as_dict(): {e}")
                            # Try to get structure directly using get_structure_by_material_id
                            try:
                                with MPRester(MP_API_KEY) as mpr2:
                                    structure_obj = mpr2.get_structure_by_material_id(material_id)
                                    if structure_obj and hasattr(structure_obj, 'as_dict'):
                                        structure_dict = structure_obj.as_dict()
                            except:
                                pass
                    elif isinstance(structure, dict):
                        structure_dict = structure
                    
                    if structure_dict:
                        print(f"Structure dict keys: {list(structure_dict.keys()) if isinstance(structure_dict, dict) else 'not a dict'}")
                        structure_data = {}
                        
                        # Extract lattice parameters from dict
                        if 'lattice' in structure_dict:
                            lattice = structure_dict['lattice']
                            if isinstance(lattice, dict):
                                structure_data["lattice"] = {
                                    "a": float(lattice.get('a', 0)) if lattice.get('a') is not None else 0.0,
                                    "b": float(lattice.get('b', 0)) if lattice.get('b') is not None else 0.0,
                                    "c": float(lattice.get('c', 0)) if lattice.get('c') is not None else 0.0,
                                    "alpha": float(lattice.get('alpha', 90)) if lattice.get('alpha') is not None else 90.0,
                                    "beta": float(lattice.get('beta', 90)) if lattice.get('beta') is not None else 90.0,
                                    "gamma": float(lattice.get('gamma', 90)) if lattice.get('gamma') is not None else 90.0,
                                    "volume": float(lattice.get('volume', 0)) if lattice.get('volume') is not None else 0.0,
                                }
                        
                        # Extract sites from dict
                        if 'sites' in structure_dict:
                            sites = structure_dict['sites']
                            structure_data["sites"] = []
                            
                            for idx, site in enumerate(sites):
                                if isinstance(site, dict):
                                    site_data = {
                                        "label": site.get('label', f"Site {idx + 1}"),
                                        "species": [],
                                        "xyz": [0.0, 0.0, 0.0],
                                    }
                                    
                                    # Extract species
                                    species_list = site.get('species', [])
                                    for species_item in species_list:
                                        if isinstance(species_item, dict):
                                            element = ''
                                            occu = 1.0
                                            
                                            # Try to get element directly
                                            if 'element' in species_item:
                                                element = str(species_item['element'])
                                            # Try to get from specie dict
                                            elif 'specie' in species_item:
                                                specie = species_item['specie']
                                                if isinstance(specie, dict):
                                                    element = str(specie.get('element', specie.get('@class', '')))
                                                else:
                                                    element = str(specie)
                                            # Try to get from string representation
                                            elif '@class' in species_item:
                                                # pymatgen format: {"@class": "Element", "@module": "...", "element": "Fe"}
                                                element = str(species_item.get('element', species_item.get('@class', '')))
                                            
                                            # Get occupancy
                                            occu = float(species_item.get('occu', species_item.get('occupancy', 1.0)))
                                            
                                            if element:
                                                site_data["species"].append({
                                                    "element": str(element),
                                                    "occu": occu
                                                })
                                    
                                    # Extract coordinates - prefer fractional (abc) over cartesian (xyz)
                                    if 'abc' in site:
                                        coords = site['abc']
                                        site_data["abc"] = [float(x) for x in coords]
                                        # Also store xyz if available for compatibility
                                        if 'xyz' in site:
                                            site_data["xyz"] = [float(x) for x in site['xyz']]
                                    elif 'frac_coords' in site:
                                        coords = site['frac_coords']
                                        site_data["abc"] = [float(x) for x in coords]
                                        # Also store xyz if available for compatibility
                                        if 'xyz' in site:
                                            site_data["xyz"] = [float(x) for x in site['xyz']]
                                    elif 'xyz' in site:
                                        coords = site['xyz']
                                        site_data["xyz"] = [float(x) for x in coords]
                                        # Try to infer if these are fractional (values in [0,1] range)
                                        if all(0 <= x <= 1 for x in coords):
                                            site_data["abc"] = [float(x) for x in coords]
                                    
                                    # Only add if we have species
                                    if site_data["species"]:
                                        structure_data["sites"].append(site_data)
                        
                        # Only add structure if we have data
                        if structure_data.get("lattice") or structure_data.get("sites"):
                            material_data["structure"] = structure_data
                            print(f"Successfully extracted structure: {len(structure_data.get('sites', []))} sites")
                        else:
                            print(f"Warning: Structure dict found but no extractable data. Keys: {list(structure_dict.keys()) if isinstance(structure_dict, dict) else 'not a dict'}")
                    else:
                        print(f"Warning: Structure object found but could not convert to dict. Type: {type(structure)}")
                except Exception as e:
                    print(f"Error extracting structure: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Add symmetry data if available
            symmetry = get_attr(doc, 'symmetry')
            if symmetry:
                try:
                    symmetry_data = {}
                    
                    # Try different ways to access symmetry data
                    if hasattr(symmetry, 'crystal_system'):
                        crystal_system = symmetry.crystal_system
                        if crystal_system is not None:
                            symmetry_data["crystal_system"] = str(crystal_system)
                    
                    if hasattr(symmetry, 'symbol'):
                        symbol = symmetry.symbol
                        if symbol is not None:
                            symmetry_data["symbol"] = str(symbol)
                    elif hasattr(symmetry, 'space_group_symbol'):
                        symbol = symmetry.space_group_symbol
                        if symbol is not None:
                            symmetry_data["symbol"] = str(symbol)
                    
                    if hasattr(symmetry, 'number'):
                        number = symmetry.number
                        if number is not None:
                            symmetry_data["number"] = int(number)
                    elif hasattr(symmetry, 'space_group_number'):
                        number = symmetry.space_group_number
                        if number is not None:
                            symmetry_data["number"] = int(number)
                    
                    # Only add if we have at least one field
                    if symmetry_data:
                        material_data["symmetry"] = symmetry_data
                except Exception as e:
                    print(f"Error getting symmetry: {e}")
                    import traceback
                    traceback.print_exc()
            
            return {
                "success": True,
                "data": material_data
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching material {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching material data: {str(e)}"
        )


@app.get("/materials/search/formula/{formula}")
async def search_by_formula(formula: str):
    """
    Search materials by chemical formula
    
    Args:
        formula: Chemical formula (e.g., "Fe2O3")
    
    Returns:
        List of matching materials
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            docs = mpr.materials.summary.search(
                formula=formula,
                fields=[
                    "material_id",
                    "formula_pretty",
                    "formula_anonymous",
                    "density",
                    "band_gap",
                    "is_metal",
                    "is_magnetic",
                ]
            )
            
            results = []
            for doc in docs:
                results.append({
                    "material_id": str(doc.material_id),
                    "formula_pretty": doc.formula_pretty,
                    "formula_anonymous": doc.formula_anonymous,
                    "density": doc.density,
                    "band_gap": doc.band_gap,
                    "is_metal": doc.is_metal,
                    "is_magnetic": doc.is_magnetic,
                })
            
            return {
                "success": True,
                "data": results
            }
            
    except Exception as e:
        print(f"Error searching materials by formula {formula}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error searching materials: {str(e)}"
        )


@app.get("/materials/{material_id}/bandstructure")
async def get_bandstructure(material_id: str):
    """
    Get band structure data for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Band structure data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            try:
                bandstructure = mpr.get_bandstructure_by_material_id(material_id)
            except Exception as e:
                # If band structure is not available, return empty data instead of error
                if "No" in str(e) and "band structure" in str(e).lower():
                    return {
                        "success": True,
                        "data": {
                            "material_id": material_id,
                            "is_metal": None,
                            "band_gap": None
                        }
                    }
                raise
            
            if not bandstructure:
                # Return empty data instead of error - band structure may not be available
                return {
                    "success": True,
                    "data": {
                        "material_id": material_id,
                        "is_metal": None,
                        "band_gap": None
                    }
                }
            
            # Convert band structure to JSON-serializable format
            bandstructure_data = {
                "material_id": material_id,
            }
            
            # Get is_metal
            try:
                if hasattr(bandstructure, 'is_metal'):
                    if callable(bandstructure.is_metal):
                        bandstructure_data["is_metal"] = bandstructure.is_metal()
                    else:
                        bandstructure_data["is_metal"] = bool(bandstructure.is_metal)
            except:
                pass
            
            # Get band gap
            try:
                if hasattr(bandstructure, 'get_band_gap'):
                    bg = bandstructure.get_band_gap()
                    if bg and isinstance(bg, dict) and 'energy' in bg:
                        bandstructure_data["band_gap"] = float(bg['energy'])
                    elif bg:
                        bandstructure_data["band_gap"] = float(bg) if isinstance(bg, (int, float)) else None
            except:
                pass
            
            # Try to get k-points and eigenvalues
            try:
                if hasattr(bandstructure, 'kpoints'):
                    kpoints = bandstructure.kpoints
                    if kpoints:
                        bandstructure_data["kpoints"] = [[float(k) for k in kp] for kp in kpoints]
                
                if hasattr(bandstructure, 'eigenvalues'):
                    eigenvalues = bandstructure.eigenvalues
                    if eigenvalues:
                        # Convert eigenvalues to list format
                        bandstructure_data["eigenvalues"] = {}
                        for spin, evals in eigenvalues.items():
                            if evals is not None:
                                bandstructure_data["eigenvalues"][str(spin)] = [[float(e) for e in band] for band in evals]
            except Exception as e:
                print(f"Error extracting band structure details: {e}")
            
            return {
                "success": True,
                "data": bandstructure_data
            }
            
    except HTTPException:
        raise
    except Exception as e:
        # Don't raise error for missing band structure, just return empty data
        error_str = str(e).lower()
        if "no" in error_str and "band structure" in error_str:
            return {
                "success": True,
                "data": {
                    "material_id": material_id,
                    "is_metal": None,
                    "band_gap": None
                }
            }
        print(f"Error fetching band structure for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching band structure: {str(e)}"
        )


@app.get("/materials/{material_id}/magnetism")
async def get_magnetism(material_id: str):
    """
    Get magnetic properties for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Magnetic properties data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            # Use the new API path to avoid deprecation warning
            magnetism_docs = mpr.materials.magnetism.search(material_ids=[material_id])
            
            if not magnetism_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Magnetic properties not found for material {material_id}"
                )
            
            doc = magnetism_docs[0]
            magnetism_data = {}
            
            # Extract magnetic properties
            if hasattr(doc, 'ordering'):
                magnetism_data["ordering"] = str(doc.ordering)
            if hasattr(doc, 'total_magnetization'):
                magnetism_data["total_magnetization"] = float(doc.total_magnetization) if doc.total_magnetization is not None else None
            if hasattr(doc, 'num_magnetic_sites'):
                magnetism_data["num_magnetic_sites"] = int(doc.num_magnetic_sites) if doc.num_magnetic_sites is not None else None
            if hasattr(doc, 'num_unique_magnetic_sites'):
                magnetism_data["num_unique_magnetic_sites"] = int(doc.num_unique_magnetic_sites) if doc.num_unique_magnetic_sites is not None else None
            
            return {
                "success": True,
                "data": magnetism_data
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching magnetism for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching magnetic properties: {str(e)}"
        )


@app.get("/materials/{material_id}/elasticity")
async def get_elasticity(material_id: str):
    """
    Get elastic constants for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Elastic constants data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            elasticity_docs = mpr.materials.elasticity.search(material_ids=[material_id])
            
            if not elasticity_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Elastic constants not found for material {material_id}"
                )
            
            doc = elasticity_docs[0]
            elasticity_data = {}
            
            # Helper to safely convert to float
            def safe_float(value, default=None):
                if value is None:
                    return default
                try:
                    if isinstance(value, str) and value.lower() in ['raw', 'none', 'null', '']:
                        return default
                    return float(value)
                except (ValueError, TypeError):
                    return default
            
            # Extract elastic properties
            if hasattr(doc, 'k_voigt'):
                elasticity_data["k_voigt"] = safe_float(doc.k_voigt)
            if hasattr(doc, 'k_reuss'):
                elasticity_data["k_reuss"] = safe_float(doc.k_reuss)
            if hasattr(doc, 'k_vrh'):
                elasticity_data["k_vrh"] = safe_float(doc.k_vrh)
            if hasattr(doc, 'g_voigt'):
                elasticity_data["g_voigt"] = safe_float(doc.g_voigt)
            if hasattr(doc, 'g_reuss'):
                elasticity_data["g_reuss"] = safe_float(doc.g_reuss)
            if hasattr(doc, 'g_vrh'):
                elasticity_data["g_vrh"] = safe_float(doc.g_vrh)
            if hasattr(doc, 'universal_anisotropy'):
                elasticity_data["universal_anisotropy"] = safe_float(doc.universal_anisotropy)
            if hasattr(doc, 'homogeneous_poisson'):
                elasticity_data["homogeneous_poisson"] = safe_float(doc.homogeneous_poisson)
            if hasattr(doc, 'elastic_tensor'):
                # Convert elastic tensor to list
                tensor = doc.elastic_tensor
                if tensor is not None:
                    try:
                        elasticity_data["elastic_tensor"] = [[safe_float(x, 0) for x in row] for row in tensor]
                    except:
                        pass
            
            return {
                "success": True,
                "data": elasticity_data
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching elasticity for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching elastic constants: {str(e)}"
        )


@app.get("/materials/{material_id}/eos")
async def get_eos(material_id: str):
    """
    Get equation of state data for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Equation of state data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            eos_docs = mpr.materials.eos.search(material_ids=[material_id])
            
            if not eos_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Equation of state not found for material {material_id}"
                )
            
            doc = eos_docs[0]
            eos_data = {}
            
            # Extract EOS properties - try different ways to access
            eos_obj = None
            if hasattr(doc, 'eos'):
                eos_obj = doc.eos
            elif hasattr(doc, 'equation_of_state'):
                eos_obj = doc.equation_of_state
            
            if eos_obj:
                eos_data["eos"] = {}
                # Try to get properties directly from doc if eos is empty
                if hasattr(doc, 'v0'):
                    eos_data["eos"]["v0"] = float(doc.v0) if doc.v0 is not None else None
                elif hasattr(eos_obj, 'v0'):
                    eos_data["eos"]["v0"] = float(eos_obj.v0) if eos_obj.v0 is not None else None
                
                if hasattr(doc, 'e0'):
                    eos_data["eos"]["e0"] = float(doc.e0) if doc.e0 is not None else None
                elif hasattr(eos_obj, 'e0'):
                    eos_data["eos"]["e0"] = float(eos_obj.e0) if eos_obj.e0 is not None else None
                
                if hasattr(doc, 'b0'):
                    eos_data["eos"]["b0"] = float(doc.b0) if doc.b0 is not None else None
                elif hasattr(eos_obj, 'b0'):
                    eos_data["eos"]["b0"] = float(eos_obj.b0) if eos_obj.b0 is not None else None
                
                if hasattr(doc, 'b1'):
                    eos_data["eos"]["b1"] = float(doc.b1) if doc.b1 is not None else None
                elif hasattr(eos_obj, 'b1'):
                    eos_data["eos"]["b1"] = float(eos_obj.b1) if eos_obj.b1 is not None else None
            
            return {
                "success": True,
                "data": eos_data
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching EOS for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching equation of state: {str(e)}"
        )


@app.get("/materials/{material_id}/xas")
async def get_xas(material_id: str):
    """
    Get X-ray Absorption Spectra for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        XAS data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            # XAS search needs to use spectrum_id format, not material_id directly
            # Try to get XAS data by searching for the material
            try:
                xas_docs = mpr.materials.xas.search(material_ids=[material_id])
            except Exception as search_error:
                # If search fails, try alternative approach
                print(f"XAS search error: {search_error}")
                xas_docs = []
            
            if not xas_docs:
                # Return empty list instead of error - XAS may not be available for all materials
                return {
                    "success": True,
                    "data": []
                }
            
            results = []
            for doc in xas_docs:
                xas_data = {
                    "material_id": str(doc.material_id) if hasattr(doc, 'material_id') else material_id,
                }
                
                if hasattr(doc, 'spectrum_type'):
                    xas_data["spectrum_type"] = str(doc.spectrum_type)
                if hasattr(doc, 'absorbing_element'):
                    xas_data["absorbing_element"] = str(doc.absorbing_element)
                if hasattr(doc, 'edge'):
                    xas_data["edge"] = str(doc.edge)
                
                results.append(xas_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching XAS for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching XAS data: {str(e)}"
        )


@app.get("/materials/{material_id}/surface-properties")
async def get_surface_properties(material_id: str):
    """
    Get surface energies for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Surface properties data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            surface_docs = mpr.materials.surface_properties.search(material_ids=[material_id])
            
            if not surface_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Surface properties not found for material {material_id}"
                )
            
            results = []
            for doc in surface_docs:
                surface_data = {
                    "material_id": str(doc.material_id) if hasattr(doc, 'material_id') else material_id,
                }
                
                if hasattr(doc, 'surface_energy_anisotropy'):
                    surface_data["surface_energy_anisotropy"] = float(doc.surface_energy_anisotropy) if doc.surface_energy_anisotropy is not None else None
                if hasattr(doc, 'weighted_surface_energy'):
                    surface_data["weighted_surface_energy"] = float(doc.weighted_surface_energy) if doc.weighted_surface_energy is not None else None
                if hasattr(doc, 'weighted_surface_energy_Wulff'):
                    surface_data["weighted_surface_energy_Wulff"] = float(doc.weighted_surface_energy_Wulff) if doc.weighted_surface_energy_Wulff is not None else None
                
                results.append(surface_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching surface properties for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching surface properties: {str(e)}"
        )


@app.get("/materials/{material_id}/similarity")
async def get_similar_materials(material_id: str, limit: int = Query(10, ge=1, le=100)):
    """
    Get similar materials
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
        limit: Maximum number of similar materials to return (default: 10)
    
    Returns:
        List of similar materials
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            similarity_docs = mpr.materials.similarity.search(material_ids=[material_id])
            
            if not similarity_docs:
                return {
                    "success": True,
                    "data": []
                }
            
            results = []
            for doc in similarity_docs[:limit]:
                similar_data = {}
                
                # Try different ways to get material_id
                if hasattr(doc, 'material_id'):
                    similar_data["material_id"] = str(doc.material_id)
                elif hasattr(doc, 'mpid'):
                    similar_data["material_id"] = str(doc.mpid)
                elif hasattr(doc, 'id'):
                    similar_data["material_id"] = str(doc.id)
                
                # Try different ways to get similarity score
                if hasattr(doc, 'similarity'):
                    similar_data["similarity"] = float(doc.similarity) if doc.similarity is not None else None
                elif hasattr(doc, 'similarity_score'):
                    similar_data["similarity"] = float(doc.similarity_score) if doc.similarity_score is not None else None
                elif hasattr(doc, 'score'):
                    similar_data["similarity"] = float(doc.score) if doc.score is not None else None
                
                if similar_data:  # Only add if we have at least material_id
                    results.append(similar_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching similar materials for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching similar materials: {str(e)}"
        )


@app.get("/materials/{material_id}/grain-boundaries")
async def get_grain_boundaries(material_id: str):
    """
    Get grain boundary data for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Grain boundary data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            gb_docs = mpr.materials.grain_boundaries.search(material_ids=[material_id])
            
            if not gb_docs:
                raise HTTPException(
                    status_code=404,
                    detail=f"Grain boundary data not found for material {material_id}"
                )
            
            results = []
            for doc in gb_docs:
                gb_data = {
                    "material_id": str(doc.material_id) if hasattr(doc, 'material_id') else material_id,
                }
                
                if hasattr(doc, 'sigma'):
                    gb_data["sigma"] = int(doc.sigma) if doc.sigma is not None else None
                if hasattr(doc, 'gb_energy'):
                    gb_data["gb_energy"] = float(doc.gb_energy) if doc.gb_energy is not None else None
                if hasattr(doc, 'rotation_angle'):
                    gb_data["rotation_angle"] = float(doc.rotation_angle) if doc.rotation_angle is not None else None
                
                results.append(gb_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching grain boundaries for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching grain boundary data: {str(e)}"
        )


@app.get("/materials/{material_id}/substrates")
async def get_substrates(material_id: str):
    """
    Get suggested substrates for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Suggested substrates data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            substrate_docs = mpr.materials.substrates.search(film_id=material_id)
            
            if not substrate_docs:
                return {
                    "success": True,
                    "data": []
                }
            
            results = []
            for doc in substrate_docs:
                substrate_data = {
                    "substrate_id": str(doc.substrate_id) if hasattr(doc, 'substrate_id') else None,
                    "film_id": str(doc.film_id) if hasattr(doc, 'film_id') else material_id,
                }
                
                if hasattr(doc, 'substrate_formula'):
                    substrate_data["substrate_formula"] = str(doc.substrate_formula)
                if hasattr(doc, 'film_formula'):
                    substrate_data["film_formula"] = str(doc.film_formula)
                if hasattr(doc, 'area'):
                    substrate_data["area"] = float(doc.area) if doc.area is not None else None
                if hasattr(doc, 'elastic_energy'):
                    substrate_data["elastic_energy"] = float(doc.elastic_energy) if doc.elastic_energy is not None else None
                
                results.append(substrate_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching substrates for {material_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching substrates: {str(e)}"
        )


@app.get("/materials/{material_id}/alloys")
async def get_alloys(material_id: str):
    """
    Get alloy systems for a material
    
    Args:
        material_id: Materials Project material ID (e.g., "mp-13")
    
    Returns:
        Alloy systems data
    """
    if not MP_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Materials Project API key is not configured"
        )
    
    try:
        with MPRester(MP_API_KEY) as mpr:
            # Try different ways to access alloy data
            alloy_docs = []
            try:
                # Try the standard way (materials.alloys)
                if hasattr(mpr.materials, 'alloys'):
                    alloy_docs = mpr.materials.alloys.search(material_ids=[material_id])
            except AttributeError:
                # Alloys endpoint may not be available in this version
                pass
            except Exception as e:
                print(f"Alloy search error: {e}")
            
            if not alloy_docs:
                return {
                    "success": True,
                    "data": []
                }
            
            results = []
            for doc in alloy_docs:
                alloy_data = {}
                
                if hasattr(doc, 'alloy_pair'):
                    alloy_data["alloy_pair"] = str(doc.alloy_pair)
                elif hasattr(doc, 'pair'):
                    alloy_data["alloy_pair"] = str(doc.pair)
                
                if alloy_data:
                    results.append(alloy_data)
            
            return {
                "success": True,
                "data": results
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching alloys for {material_id}: {str(e)}")
        # Return empty list instead of error - alloys may not be available
        return {
            "success": True,
            "data": []
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

