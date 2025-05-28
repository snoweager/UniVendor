import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import S3FileUpload from "@/components/common/S3FileUpload";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusCircle,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  X,
  AlertCircle,
} from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";

// Define types
interface Attribute {
  name: string;
  values: string[];
}

interface MatrixVariant {
  id: string | number;
  createdAt: Date | null;
  color: string;
  size: string;
  purchasePrice: string | null;
  sellingPrice: string;
  mrp: string | null;
  gst: string | null;
  sku: string | null;
  barcode: string | null;
  weight: string | null; 
  inventoryQuantity: number;
  isDefault: boolean;
  productId: number;
  imageUrl: string | null;
  attributes: Record<string, string>;
  images: string[];
  position: number | null;
  updatedAt?: Date | null; // Make this optional for compatibility
}

interface ProductProps {
  id: number;
  name: string;
  [key: string]: any;
}

interface MatrixVariantManagerProps {
  product: ProductProps;
  initialVariant?: MatrixVariant | null;
  onClose: () => void;
}

const MatrixVariantManager = ({ 
  product, 
  initialVariant = null, 
  onClose 
}: MatrixVariantManagerProps) => {
  const [attributes, setAttributes] = useState<Attribute[]>([
    { name: "Color", values: [] },
    { name: "Size", values: [] }
  ]);
  const [selectedTab, setSelectedTab] = useState("matrix");
  const [variants, setVariants] = useState<MatrixVariant[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    sellingPrice?: number | null;
    mrp?: number | null;
    inventoryQuantity?: number | null;
  }>({});
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<MatrixVariant | null>(null);
  const { toast } = useToast();

  // Initialize variants from initialVariant (if provided)
  useEffect(() => {
    if (initialVariant) {
      setIsEditMode(true);
      setSelectedTab("details");
      
      // Set initial attribute structure based on existing variant
      const attrsFromVariant: Attribute[] = [];
      
      // Always include color and size as base attributes
      const colorAttr = { name: "Color", values: [initialVariant.color] };
      const sizeAttr = { name: "Size", values: [initialVariant.size] };
      
      attrsFromVariant.push(colorAttr);
      attrsFromVariant.push(sizeAttr);
      
      // Add any other custom attributes from the variant
      Object.entries(initialVariant.attributes || {}).forEach(([key, value]) => {
        if (key !== "Color" && key !== "Size") {
          attrsFromVariant.push({ name: key, values: [value] });
        }
      });
      
      setAttributes(attrsFromVariant);
      setVariants([initialVariant]);
    }
  }, [initialVariant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditMode && variants.length === 1) {
        // Update existing variant
        const variant = variants[0];
        await apiRequest("PUT", `/api/products/${product.id}/variants/${variant.id}`, {
          color: variant.color,
          size: variant.size,
          purchasePrice: variant.purchasePrice,
          sellingPrice: variant.sellingPrice,
          mrp: variant.mrp,
          gst: variant.gst,
          sku: variant.sku,
          barcode: variant.barcode,
          weight: variant.weight,
          inventoryQuantity: variant.inventoryQuantity,
          isDefault: variant.isDefault,
          attributes: variant.attributes,
          images: variant.images,
          imageUrl: variant.imageUrl,
        });
      } else {
        // Create new variants
        await Promise.all(
          variants.map(variant => 
            apiRequest("POST", `/api/products/${product.id}/variants`, {
              color: variant.color,
              size: variant.size,
              purchasePrice: variant.purchasePrice,
              sellingPrice: variant.sellingPrice,
              mrp: variant.mrp,
              gst: variant.gst,
              sku: variant.sku,
              barcode: variant.barcode,
              weight: variant.weight,
              inventoryQuantity: variant.inventoryQuantity,
              isDefault: variant.isDefault,
              attributes: variant.attributes,
              images: variant.images,
              imageUrl: variant.imageUrl,
            })
          )
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", product.id, "variants"] });
      toast({
        title: isEditMode ? "Variant updated" : "Variants created",
        description: isEditMode
          ? "The variant has been updated successfully."
          : "New variants have been created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save variants",
        variant: "destructive",
      });
    },
  });

  // Add a new attribute value
  const addAttributeValue = (attrIndex: number) => {
    if (!newAttribute.value) return;
    
    const updatedAttributes = [...attributes];
    const currentValues = updatedAttributes[attrIndex].values;
    const attrName = updatedAttributes[attrIndex].name;
    
    // Trim the value to remove whitespace
    const trimmedValue = newAttribute.value.trim();
    
    if (!trimmedValue) {
      setErrors({...errors, attributeValue: "Value cannot be empty"});
      return;
    }
    
    // Prevent duplicate values (case-insensitive)
    if (currentValues.some(val => val.toLowerCase() === trimmedValue.toLowerCase())) {
      setErrors({...errors, attributeValue: "Value already exists"});
      return;
    }
    
    // For colors, validate that it's a recognizable color name or hex code
    if (attrName === "Color") {
      // Simple validation for common color names or hex codes
      const validColorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      const commonColors = [
        "black", "white", "red", "green", "blue", "yellow", "purple", 
        "pink", "orange", "brown", "gray", "cyan", "magenta", "silver", 
        "gold", "navy", "teal", "maroon", "olive", "lime", "aqua"
      ];
      
      if (!validColorPattern.test(trimmedValue) && !commonColors.includes(trimmedValue.toLowerCase())) {
        // Still allow it, but show a warning in console - don't interrupt the flow
        console.warn(`"${trimmedValue}" might not be a standard color name or hex code`);
      }
    }
    
    updatedAttributes[attrIndex].values.push(trimmedValue);
    setAttributes(updatedAttributes);
    setNewAttribute({...newAttribute, value: ''});
    setErrors({...errors, attributeValue: ''});
    
    // If we're in edit mode, we need to update the variant's attribute
    if (isEditMode && variants.length === 1) {
      const variant = variants[0];
      const attrName = updatedAttributes[attrIndex].name;
      const updatedVariant = {
        ...variant,
        attributes: {
          ...variant.attributes,
          [attrName]: newAttribute.value
        }
      };
      
      // Special handling for color and size which are top-level properties
      if (attrName === "Color") {
        updatedVariant.color = newAttribute.value;
      } else if (attrName === "Size") {
        updatedVariant.size = newAttribute.value;
      }
      
      setVariants([updatedVariant]);
    }
  };

  // Remove an attribute value
  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[attrIndex].values.splice(valueIndex, 1);
    setAttributes(updatedAttributes);
  };

  // Add a new custom attribute
  const addNewAttribute = () => {
    if (!newAttribute.name) return;
    
    // Validate attribute name
    if (attributes.some(attr => attr.name === newAttribute.name)) {
      setErrors({...errors, attributeName: "Attribute already exists"});
      return;
    }
    
    setAttributes([...attributes, { name: newAttribute.name, values: [] }]);
    setNewAttribute({ name: '', value: '' });
    setErrors({...errors, attributeName: ''});
  };

  // Remove a custom attribute
  const removeAttribute = (index: number) => {
    const updatedAttributes = [...attributes];
    updatedAttributes.splice(index, 1);
    setAttributes(updatedAttributes);
  };

  // Generate all possible combinations of attribute values
  const generateVariantMatrix = () => {
    // Validate that both color and size have values
    const colorAttr = attributes.find(a => a.name === "Color");
    const sizeAttr = attributes.find(a => a.name === "Size");
    
    if (!colorAttr?.values.length || !sizeAttr?.values.length) {
      setErrors({...errors, matrix: "Both color and size must have at least one value"});
      return;
    }
    
    // Clear errors
    setErrors({...errors, matrix: ''});
    
    // Create all combinations for color x size
    const results: MatrixVariant[] = [];
    
    // Generate combinations
    for (const color of colorAttr.values) {
      for (const size of sizeAttr.values) {
        // Base price for all generated variants
        const defaultPrice = product.price || product.sellingPrice || "0";
        
        results.push({
          id: uuidv4(),
          productId: product.id,
          color: color,
          size: size,
          sku: `${product.sku || product.name?.substring(0, 3).toUpperCase() || "PROD"}-${color}-${size}`.replace(/\s+/g, '-'),
          attributes: { "Color": color, "Size": size },
          sellingPrice: defaultPrice,
          mrp: defaultPrice,
          purchasePrice: (parseFloat(defaultPrice) * 0.7).toString(), // Example: 30% margin
          gst: "18", // Default GST percentage
          inventoryQuantity: 10, // Default inventory
          isDefault: false,
          weight: null,
          barcode: null,
          position: null,
          createdAt: null,
          updatedAt: null, // Required for compatibility with DB
          images: [],
          imageUrl: null,
        });
      }
    }
    
    setVariants(results);
    setSelectedTab("details");
  };

  // Update a specific variant field
  const updateVariantField = (index: number, field: string, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value
    };
    setVariants(updatedVariants);
  };

  // Remove a variant
  const removeVariant = (index: number) => {
    const updatedVariants = [...variants];
    updatedVariants.splice(index, 1);
    setVariants(updatedVariants);
  };

  // Set a variant as default
  const setDefaultVariant = (index: number) => {
    const updatedVariants = variants.map((variant, i) => ({
      ...variant,
      isDefault: i === index
    }));
    setVariants(updatedVariants);
  };

  // Apply bulk edit to selected variants
  const applyBulkEdit = () => {
    if (selectedVariants.length === 0) {
      toast({
        title: "No variants selected",
        description: "Please select at least one variant to apply bulk edits",
        variant: "destructive"
      });
      return;
    }
    
    const updatedVariants = variants.map(variant => {
      if (selectedVariants.includes(variant.id.toString())) {
        const updated = { ...variant };
        
        if (bulkEditData.mrp !== undefined) {
          updated.mrp = bulkEditData.mrp?.toString() || null;
        }
        
        if (bulkEditData.sellingPrice !== undefined) {
          updated.sellingPrice = bulkEditData.sellingPrice?.toString() || "0";
        }
        
        if (bulkEditData.inventoryQuantity !== undefined) {
          updated.inventoryQuantity = bulkEditData.inventoryQuantity || 0;
        }
        
        return updated;
      }
      return variant;
    });
    
    setVariants(updatedVariants);
    setBulkEditData({});
    setBulkEditMode(false);
    setSelectedVariants([]);
    
    toast({
      title: "Bulk edit applied",
      description: `Updated ${selectedVariants.length} variants`
    });
  };

  // Validate before saving
  const validateBeforeSave = () => {
    const newErrors: Record<string, string> = {};
    
    // Check for empty variants
    if (variants.length === 0) {
      newErrors.variants = "No variants to save";
    }
    
    // Check for missing required fields in variants
    variants.forEach((variant, index) => {
      if (Number(variant.sellingPrice) <= 0) {
        newErrors[`variant_${index}_price`] = "Price must be greater than 0";
      }
      
      if (Number(variant.inventoryQuantity) < 0) {
        newErrors[`variant_${index}_inventory`] = "Inventory cannot be negative";
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save action
  const handleSave = () => {
    if (validateBeforeSave()) {
      saveMutation.mutate();
    }
  };

  // If we have no variants yet and we're not in edit mode, show the initial attribute selection UI
  const showInitialAttributeUI = variants.length === 0 && !isEditMode;
  
  return (
    <div className="py-4">
      {showInitialAttributeUI ? (
        // Initial attribute selection UI - based on first screenshot
        <div className="space-y-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Create Additional Variants</h3>
            <p className="text-gray-600">
              Define color and size options to automatically generate additional variant combinations
            </p>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-4">Define Variant Attributes</h4>
            <p className="text-gray-600 mb-4">
              Add possible values for each attribute to generate all variant combinations
            </p>
            
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-base">Color</Label>
                <Badge variant="secondary">{attributes.find(a => a.name === "Color")?.values.length || 0}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-base">Size</Label>
                <Badge variant="secondary">{attributes.find(a => a.name === "Size")?.values.length || 0}</Badge>
              </div>
            </div>
            
            {/* Color attribute input */}
            <div className="mb-6">
              <div className="mb-2">
                <Label>Add Color Value</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a new color value"
                  value={newAttribute.value}
                  onChange={(e) => setNewAttribute({...newAttribute, value: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttributeValue(attributes.findIndex(a => a.name === "Color"));
                    }
                  }}
                />
                <Button 
                  onClick={() => addAttributeValue(attributes.findIndex(a => a.name === "Color"))}
                  disabled={!newAttribute.value}
                >
                  Add
                </Button>
              </div>
              
              {errors.attributeValue && (
                <div className="text-sm text-destructive mt-1">
                  {errors.attributeValue}
                </div>
              )}
              
              {/* Display added color values */}
              {attributes.find(a => a.name === "Color")?.values.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Added Values:</div>
                  <div className="flex flex-wrap gap-2">
                    {attributes.find(a => a.name === "Color")?.values.map((value, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="py-1.5 pl-1"
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-1.5" 
                          style={{
                            backgroundColor: value.toLowerCase(),
                            borderColor: ['white', '#ffffff', '#fff', 'transparent'].includes(value.toLowerCase()) 
                              ? '#e2e8f0' 
                              : value.toLowerCase()
                          }}
                        />
                        {value}
                        <X 
                          className="h-3.5 w-3.5 ml-1.5 cursor-pointer" 
                          onClick={() => removeAttributeValue(attributes.findIndex(a => a.name === "Color"), index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Size attribute input */}
            <div className="mb-6">
              <div className="mb-2">
                <Label>Add Size Value</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a new size value"
                  value={newAttribute.value}
                  onChange={(e) => setNewAttribute({...newAttribute, value: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttributeValue(attributes.findIndex(a => a.name === "Size"));
                    }
                  }}
                />
                <Button 
                  onClick={() => addAttributeValue(attributes.findIndex(a => a.name === "Size"))}
                  disabled={!newAttribute.value}
                >
                  Add
                </Button>
              </div>
              
              {/* Display added size values */}
              {attributes.find(a => a.name === "Size")?.values.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Added Values:</div>
                  <div className="flex flex-wrap gap-2">
                    {attributes.find(a => a.name === "Size")?.values.map((value, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="py-1.5"
                      >
                        {value}
                        <X 
                          className="h-3.5 w-3.5 ml-1.5 cursor-pointer" 
                          onClick={() => removeAttributeValue(attributes.findIndex(a => a.name === "Size"), index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center mt-8 mb-3">
              <span className="text-sm text-muted-foreground">
                This will create {attributes.find(a => a.name === "Color")?.values.length || 0} × {attributes.find(a => a.name === "Size")?.values.length || 0} = {(attributes.find(a => a.name === "Color")?.values.length || 0) * (attributes.find(a => a.name === "Size")?.values.length || 0)} variant combinations
              </span>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button
                onClick={generateVariantMatrix}
                className="px-4 py-2"
                disabled={(attributes.find(a => a.name === "Color")?.values.length || 0) === 0 || 
                         (attributes.find(a => a.name === "Size")?.values.length || 0) === 0}
              >
                Continue to Configure Variants
              </Button>
            </div>
            
            {errors.matrix && (
              <div className="text-sm text-destructive mt-1 text-center">
                {errors.matrix}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Use tabs for existing variants or after generation
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="matrix" disabled={isEditMode}>Define Matrix</TabsTrigger>
            <TabsTrigger 
              value="details" 
              disabled={variants.length === 0 && !isEditMode}
            >
              Variant Details
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              disabled={!selectedVariant}
            >
              Images
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matrix">
            <div className="space-y-6">
              {attributes.map((attr, attrIndex) => (
                <div key={attrIndex} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{attr.name}</Label>
                    {attrIndex > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttribute(attrIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attr.values.map((value, valueIndex) => (
                      <Badge 
                        key={valueIndex} 
                        variant="outline" 
                        className={cn(
                          "py-1.5",
                          attr.name === "Color" && "pl-1"
                        )}
                      >
                        {attr.name === "Color" && (
                          <div 
                            className="h-4 w-4 rounded-full mr-1.5 border"
                            style={{ 
                              backgroundColor: value.toLowerCase(),
                              borderColor: ['white', '#ffffff', '#fff', 'transparent'].includes(value.toLowerCase()) 
                                ? '#e2e8f0' 
                                : value.toLowerCase() 
                            }}
                          />
                        )}
                        {value}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1 hover:bg-transparent"
                          onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Add ${attr.name.toLowerCase()} value (press Enter to add)`}
                      value={attrIndex === attributes.findIndex(a => a.name === attr.name) ? newAttribute.value : ''}
                      onChange={(e) => setNewAttribute({...newAttribute, value: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && attrIndex === attributes.findIndex(a => a.name === attr.name)) {
                          e.preventDefault();
                          addAttributeValue(attrIndex);
                        }
                      }}
                    />
                    <Button 
                      onClick={() => addAttributeValue(attrIndex)}
                      disabled={!newAttribute.value && attrIndex === attributes.findIndex(a => a.name === attr.name)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 mt-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Add Custom Attribute</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Attribute name (e.g. Material, press Enter to add)"
                      value={newAttribute.name}
                      onChange={(e) => setNewAttribute({...newAttribute, name: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAttribute.name) {
                          e.preventDefault();
                          addNewAttribute();
                        }
                      }}
                    />
                    <Button 
                      onClick={addNewAttribute}
                      disabled={!newAttribute.name}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6 mt-6">
                <div className="text-center mb-3">
                  <span className="text-sm text-muted-foreground">
                    This will create {attributes.find(a => a.name === "Color")?.values.length || 0} × {attributes.find(a => a.name === "Size")?.values.length || 0} = {(attributes.find(a => a.name === "Color")?.values.length || 0) * (attributes.find(a => a.name === "Size")?.values.length || 0)} variant combinations
                  </span>
                </div>
                <Button
                  onClick={generateVariantMatrix}
                  className="w-full py-6 text-base"
                  size="lg"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Generate Variant Matrix
                </Button>
                
                {errors.matrix && (
                  <div className="text-sm text-destructive mt-1 text-center">
                    {errors.matrix}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            {variants.length > 0 ? (
              <div className="space-y-6">
                {/* Bulk Edit Controls */}
                <div className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Bulk Edit Variants</h3>
                    <Button 
                      variant={bulkEditMode ? "default" : "outline"}
                      onClick={() => setBulkEditMode(!bulkEditMode)}
                    >
                      {bulkEditMode ? "Cancel Bulk Edit" : "Enable Bulk Edit"}
                    </Button>
                  </div>
                  
                  {bulkEditMode && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bulk-mrp">MRP</Label>
                          <Input
                            id="bulk-mrp"
                            type="number"
                            placeholder="Enter MRP"
                            value={bulkEditData.mrp !== undefined ? bulkEditData.mrp || '' : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                setBulkEditData({...bulkEditData, mrp: null});
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue < 0) {
                                setErrors({...errors, bulkMrp: "MRP cannot be negative"});
                                return;
                              }
                              setErrors({...errors, bulkMrp: ""});
                              setBulkEditData({...bulkEditData, mrp: numValue});
                            }}
                          />
                          {errors.bulkMrp && (
                            <div className="text-sm text-destructive mt-1">
                              {errors.bulkMrp}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="bulk-price">Selling Price</Label>
                          <Input
                            id="bulk-price"
                            type="number"
                            placeholder="Enter selling price"
                            value={bulkEditData.sellingPrice !== undefined ? bulkEditData.sellingPrice || '' : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                setBulkEditData({...bulkEditData, sellingPrice: null});
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue < 0) {
                                setErrors({...errors, bulkSellingPrice: "Selling price cannot be negative"});
                                return;
                              }
                              setErrors({...errors, bulkSellingPrice: ""});
                              setBulkEditData({...bulkEditData, sellingPrice: numValue});
                            }}
                          />
                          {errors.bulkSellingPrice && (
                            <div className="text-sm text-destructive mt-1">
                              {errors.bulkSellingPrice}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="bulk-inventory">Inventory</Label>
                          <Input
                            id="bulk-inventory"
                            type="number"
                            placeholder="Enter inventory quantity"
                            value={bulkEditData.inventoryQuantity !== undefined ? bulkEditData.inventoryQuantity || '' : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                setBulkEditData({...bulkEditData, inventoryQuantity: null});
                                return;
                              }
                              const numValue = parseInt(value);
                              if (numValue < 0) {
                                setErrors({...errors, bulkInventory: "Inventory cannot be negative"});
                                return;
                              }
                              setErrors({...errors, bulkInventory: ""});
                              setBulkEditData({...bulkEditData, inventoryQuantity: numValue});
                            }}
                          />
                          {errors.bulkInventory && (
                            <div className="text-sm text-destructive mt-1">
                              {errors.bulkInventory}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button onClick={applyBulkEdit} disabled={selectedVariants.length === 0}>
                        Apply to Selected ({selectedVariants.length})
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Variants Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      {bulkEditMode && (
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedVariants.length === variants.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedVariants(variants.map(v => v.id.toString()));
                              } else {
                                setSelectedVariants([]);
                              }
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Images</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant, index) => (
                      <TableRow key={index}>
                        {bulkEditMode && (
                          <TableCell>
                            <Checkbox
                              checked={selectedVariants.includes(variant.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedVariants([...selectedVariants, variant.id.toString()]);
                                } else {
                                  setSelectedVariants(selectedVariants.filter(id => id !== variant.id.toString()));
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">
                            <div>
                              <strong>Color:</strong> {variant.color}
                            </div>
                            <div>
                              <strong>Size:</strong> {variant.size}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={variant.sku || ''}
                            onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                            className="w-full max-w-[120px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={variant.sellingPrice || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue < 0) {
                                setErrors({...errors, [`variant_${index}_price`]: "Price cannot be negative"});
                                return;
                              }
                              setErrors({...errors, [`variant_${index}_price`]: ""});
                              updateVariantField(index, 'sellingPrice', value);
                            }}
                            className="w-full max-w-[80px]"
                          />
                          {errors[`variant_${index}_price`] && (
                            <div className="text-sm text-destructive mt-1">
                              {errors[`variant_${index}_price`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={variant.mrp || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                updateVariantField(index, 'mrp', null);
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue < 0) {
                                setErrors({...errors, [`variant_${index}_mrp`]: "MRP cannot be negative"});
                                return;
                              }
                              setErrors({...errors, [`variant_${index}_mrp`]: ""});
                              updateVariantField(index, 'mrp', value);
                            }}
                            className="w-full max-w-[80px]"
                          />
                          {errors[`variant_${index}_mrp`] && (
                            <div className="text-sm text-destructive mt-1">
                              {errors[`variant_${index}_mrp`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={variant.inventoryQuantity || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!value) {
                                return;
                              }
                              const numValue = parseInt(value);
                              if (numValue < 0) {
                                setErrors({...errors, [`variant_${index}_inventory`]: "Inventory cannot be negative"});
                                return;
                              }
                              setErrors({...errors, [`variant_${index}_inventory`]: ""});
                              updateVariantField(index, 'inventoryQuantity', numValue);
                            }}
                            className="w-full max-w-[80px]"
                          />
                          {errors[`variant_${index}_inventory`] && (
                            <div className="text-sm text-destructive mt-1">
                              {errors[`variant_${index}_inventory`]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedVariant(variant);
                              setSelectedTab("images");
                            }}
                          >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            {variant.images.length || 0}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg text-muted-foreground">
                  No variants defined. Go to the Matrix tab to generate variants.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="images">
            {selectedVariant ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Images for {selectedVariant.color} - {selectedVariant.size}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTab("details")}
                  >
                    Back to Variants
                  </Button>
                </div>
                
                <S3FileUpload
                  folder="product-variants"
                  onUpload={(urls) => {
                    const index = variants.findIndex(v => v.id === selectedVariant.id);
                    if (index !== -1) {
                      const updatedVariant = {
                        ...variants[index],
                        images: [...variants[index].images, ...urls]
                      };
                      if (!updatedVariant.imageUrl && urls.length > 0) {
                        updatedVariant.imageUrl = urls[0];
                      }
                      const updatedVariants = [...variants];
                      updatedVariants[index] = updatedVariant;
                      setVariants(updatedVariants);
                      setSelectedVariant(updatedVariant);
                    }
                  }}
                />
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  {selectedVariant.images.map((url, i) => (
                    <div key={i} className="relative group border rounded-md overflow-hidden aspect-square">
                      <img 
                        src={url} 
                        alt={`Variant image ${i+1}`} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const index = variants.findIndex(v => v.id === selectedVariant.id);
                            if (index !== -1) {
                              const updatedImages = [...variants[index].images];
                              updatedImages.splice(i, 1);
                              
                              const updatedVariant = {
                                ...variants[index],
                                images: updatedImages,
                                imageUrl: updatedImages.length > 0 ? 
                                  (variants[index].imageUrl === url ? updatedImages[0] : variants[index].imageUrl) 
                                  : null
                              };
                              
                              const updatedVariants = [...variants];
                              updatedVariants[index] = updatedVariant;
                              setVariants(updatedVariants);
                              setSelectedVariant(updatedVariant);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        {selectedVariant.imageUrl !== url && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const index = variants.findIndex(v => v.id === selectedVariant.id);
                              if (index !== -1) {
                                const updatedVariant = {
                                  ...variants[index],
                                  imageUrl: url
                                };
                                const updatedVariants = [...variants];
                                updatedVariants[index] = updatedVariant;
                                setVariants(updatedVariants);
                                setSelectedVariant(updatedVariant);
                              }
                            }}
                          >
                            Set as Main
                          </Button>
                        )}
                      </div>
                      
                      {selectedVariant.imageUrl === url && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedVariant.images.length === 0 && (
                  <div className="text-center py-8 border rounded-md">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No images uploaded yet. Upload images above.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Select a variant from the Details tab to manage its images.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      <DialogFooter className="mt-6 gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEditMode ? "Update Variant" : "Save Variants"}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default MatrixVariantManager;