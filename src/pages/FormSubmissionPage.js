import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Receipt, CheckCircle, Eye, Download, FileText, ChevronRight, ChevronLeft, Info, Search, X, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getShareholderById, getStockbrokers, submitRightsForm, previewRightsForm } from '../services/api'; // Import API functions


const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select an option',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = React.useRef(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative" ref={selectRef}>
      <div 
        className={`form-select w-full flex items-center justify-between cursor-pointer ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm max-h-60 overflow-auto">
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${
                    value === option.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ target: { name: 'stockbroker', value: option.id } });
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FormSubmissionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shareholder, setShareholder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stockbrokers, setStockbrokers] = useState([]);
  const [calculatedAmount, setCalculatedAmount] = useState(0);


  const [formData, setFormData] = useState({
    // Basic info (prefilled)
    reg_account_number: '',
    name: '',
    holdings: '',
    rights_issue: '',
    holdings_after: '',
    amount_due: '',

    
    // Instructions
    instructions_read: false,
    
    // Stockbroker & CHN details
    stockbroker: '',
    chn: '',
    
    // Action choice
    action_type: '', // 'full_acceptance' or 'renunciation_partial'
    
    // Full acceptance fields
    accept_full: false,
    apply_additional: false,
    additional_shares: '',
    additional_amount: '',
    accept_smaller_allotment: false,
    payment_amount: '',
    bank_name: '',
    cheque_number: '',
    branch: '',
    
    // Renunciation/Partial acceptance fields
    shares_accepted: '',
    amount_payable: '',
    shares_renounced: '',
    accept_partial: false,
    renounce_rights: false,
    trade_rights: false,
    
    // Personal details
    contact_name: '',
    next_of_kin: '',
    daytime_phone: '',
    mobile_phone: '',
    email: '',
    
    // Bank details
    bank_name_edividend: '',
    bank_branch_edividend: '',
    account_number: '',
    bvn: '',
    
    // Corporate details (optional)
    corporate_signatory_names: '',
    corporate_designations: '',
    
    // Signature type
    signature_type: 'single', // 'single' or 'joint'
    
    // File upload
    receipt: null,
    signatures: [] // Array for multiple signatures if joint
  });

  const [submittedForm, setSubmittedForm] = useState(null);
  const [showFinalPreview, setShowFinalPreview] = useState(false);

  const steps = [
    { id: 1, title: 'Shareholder Information', description: 'Review your details' },
    { id: 2, title: 'Instructions', description: 'Read and accept instructions' },
    { id: 3, title: 'Stockbroker & CHN', description: 'Enter stockbroker and CHN details' },
    { id: 4, title: 'Action Choice', description: 'Select your action type' },
    { id: 5, title: 'Action Details', description: 'Complete your selected action' },
    { id: 6, title: 'Personal & Bank Info', description: 'Contact and banking information' },
    { id: 7, title: 'Signature & Receipt', description: 'Upload documents' },
    { id: 8, title: 'Summary & Submit', description: 'Review and final submission' }
  ];


  // Add this useEffect to handle total payment calculation
useEffect(() => {
  // Calculate additional amount when additional shares change
  if (formData.apply_additional && formData.additional_shares) {
    const shares = parseFloat(formData.additional_shares) || 0;
    const additionalAmount = (shares * 7).toFixed(2);
    setCalculatedAmount(parseFloat(additionalAmount));
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      additional_amount: additionalAmount
    }));
  } else {
    setCalculatedAmount(0);
    setFormData(prev => ({
      ...prev,
      additional_amount: ''
    }));
  }
}, [formData.additional_shares, formData.apply_additional]);

// Add this function to calculate total payment
const calculateTotalPayment = () => {
  const amountDue = parseFloat(formData.amount_due) || 0;
  const additionalAmount = parseFloat(formData.additional_amount) || 0;
  return (amountDue + additionalAmount).toFixed(2);
};

// Add this function to handle manual payment amount changes
// const handlePaymentAmountChange = (e) => {
//   const value = e.target.value;
//   setFormData(prev => ({
//     ...prev,
//     payment_amount: value
//   }));
// };



  useEffect(() => {
    const fetchShareholder = async () => {
      try {
        setLoading(true);
        
        // Use the API service function instead of direct axios call
        const response = await getShareholderById(id);
        
        if (response.success) {
          const shareholderData = response.data;
          setShareholder(shareholderData);
          
          // Pre-fill form with shareholder data
          setFormData(prev => ({
            ...prev,
            reg_account_number: shareholderData.reg_account_number,
            name: shareholderData.name,
            holdings: shareholderData.holdings,
            rights_issue: shareholderData.rights_issue,
            holdings_after: shareholderData.holdings_after,
            amount_due: shareholderData.amount_due,
            contact_name: shareholderData.name,
          }));
        } else {
          toast.error('Failed to load shareholder details');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching shareholder:', error);
        toast.error('Error loading shareholder details');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    const fetchStockbrokers = async () => {
      try {
        // Use the API service function instead of direct axios call
        const response = await getStockbrokers();
        if (response.success) {
          setStockbrokers(response.data);
        }
      } catch (error) {
        console.error('Error fetching stockbrokers:', error);
        // Set empty array as fallback
        setStockbrokers([]);
      }
    };

    fetchShareholder();
    fetchStockbrokers();
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

// In your FormSubmissionPage.js, update the file validation
const handleFileChange = (e, field, index = null) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Define allowed file types
  const allowedTypes = {
    receipt: ['image/jpeg', 'image/jpg', 'image/png'],
    signatures: ['image/jpeg', 'image/jpg', 'image/png']
  };
  
  // Get the allowed types for this field
  const fieldType = field === 'receipt' ? 'receipt' : 'signatures';
  const allowed = allowedTypes[fieldType];
  
  // Validate file type
  if (!allowed.includes(file.type)) {
    toast.error(`Invalid file type. Please upload only JPG, JPEG, or PNG images.`);
    e.target.value = ''; // Clear the file input
    return;
  }
  
  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    toast.error('File size must be less than 5MB');
    e.target.value = ''; // Clear the file input
    return;
  }
  
  // If all validations pass, update the form data
  if (field === 'signatures' && index !== null) {
    const newSignatures = [...formData.signatures];
    newSignatures[index] = file;
    setFormData(prev => ({
      ...prev,
      signatures: newSignatures
    }));
    toast.success(`Signature ${index + 1} uploaded successfully`);
  } else {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
    toast.success(`${field === 'receipt' ? 'Receipt' : 'Signature'} uploaded successfully`);
  }
};

  const addSignatureField = () => {
    setFormData(prev => ({
      ...prev,
      signatures: [...prev.signatures, null]
    }));
  };

  const removeSignatureField = (index) => {
    const newSignatures = formData.signatures.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      signatures: newSignatures
    }));
  };

const validateStep = (step) => {
  switch (step) {
    case 1:
      return true;
    case 2:
      return formData.instructions_read;
    case 3:
      return formData.stockbroker && formData.chn;
    case 4:
      return formData.action_type;
    case 5:
      if (formData.action_type === 'full_acceptance') {
        // Only require accept_full to be checked
        if (!formData.accept_full) return false;
        
        // If applying for additional shares, validate those fields too
        if (formData.apply_additional) {
          return formData.additional_shares && 
                
                 formData.bank_name 
           
        }
        
        // If only accepting full allotment (no additional shares), no further validation needed
        return true;
      } else {
        return formData.shares_accepted && formData.amount_payable && formData.shares_renounced && 
               (formData.accept_partial || formData.renounce_rights);
      }
    case 6:
      return formData.contact_name && formData.next_of_kin && 
             formData.daytime_phone && formData.mobile_phone && formData.email &&
             formData.bank_name_edividend && 
             formData.account_number && formData.bvn;
    case 7:
      if (formData.signature_type === 'single') {
        return formData.receipt && formData.signatures.length > 0;
      } else {
        return formData.receipt && formData.signatures.length > 1 && 
               !formData.signatures.includes(null);
      }
    default:
      return true;
  }
};

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 8));
    } else {
      toast.error('Please complete all required fields in this step');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Show loading state
      const loadingToast = toast.loading('Generating rights form and submitting...');
      
      // Clean numeric fields
      const numericFields = [
        'shareholder_id', 'stockbroker', 'additional_shares', 'additional_amount',
        'payment_amount', 'shares_accepted', 'amount_payable', 'shares_renounced',
        'holdings', 'rights_issue', 'holdings_after', 'amount_due'
      ];
      
      // Create a new object with cleaned numeric fields
      const cleanedFormData = { ...formData };
      numericFields.forEach(field => {
        if (field in cleanedFormData && cleanedFormData[field] !== '') {
          cleanedFormData[field] = Number(cleanedFormData[field]);
        } else if (field in cleanedFormData) {
          cleanedFormData[field] = null;
        }
      });
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(cleanedFormData).forEach(key => {
        if (key !== 'receipt' && key !== 'signatures' && cleanedFormData[key] !== null) {
          submitData.append(key, cleanedFormData[key]);
        }
      });
      
      // Add files
      submitData.append('shareholder_id', id);
      if (cleanedFormData.receipt) {
        submitData.append('receipt', cleanedFormData.receipt);
      }
      
      // Handle signatures based on signature type
      if (formData.signature_type === 'single' && formData.signatures[0]) {
        // For single signature, only upload the first signature
        submitData.append('signature_0', formData.signatures[0]);
      } else if (formData.signature_type === 'joint') {
        // For joint signatures, upload all provided signatures
        (formData.signatures || []).forEach((signature, index) => {
          if (signature) {
            submitData.append(`signature_${index}`, signature);
          }
        });
      }

      // Use the API service function instead of direct axios call
      const response = await submitRightsForm(submitData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.success) {
        setSubmittedForm(response.data);
        setShowFinalPreview(true);
        toast.success('Form submitted successfully!');
      } else {
        toast.error(response.message || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  }

  const generatePreviewUrl = async () => {
    try {
      // Use the API service function instead of direct axios call
      const response = await previewRightsForm({
        ...formData,
        shareholder_id: id
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
      return null;
    }
  };

  const handleViewForm = async () => {
    const url = await generatePreviewUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadForm = async () => {
    const url = await generatePreviewUrl();
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `rights-form-${formData.reg_account_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shareholder details...</p>
        </div>
      </div>
    );
  }

  if (!shareholder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Shareholder not found</p>
          <Link to="/" className="btn-primary">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (showFinalPreview && submittedForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Submitted Successfully!</h1>
            <p className="text-gray-600">Your rights issue form has been submitted and processed.</p>
          </div>

          {/* Form Summary */}
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Submission Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Registration Account:</span>
                <p className="font-medium">{submittedForm.reg_account_number}</p>
              </div>
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium">{submittedForm.name}</p>
              </div>
              <div>
                <span className="text-gray-600">CHN:</span>
                <p className="font-medium">{submittedForm.chn}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Amount Payable:</span>
                <p className="font-medium">₦{parseFloat(calculateTotalPayment(submittedForm)).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Submission Date:</span>
                <p className="font-medium">{new Date(submittedForm.created_at).toLocaleDateString()}</p>
              </div>
              {/* <div>
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {submittedForm.status}
                </span>
              </div> */}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Filled Form</h2>
            <p className="text-gray-600 mb-6">You can now view and download your completed rights issue form. </p>
            <p className="text-gray-600 mb-6">A copy of your filled form has been sent to your email address. </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleViewForm}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-5 w-5 mr-2" />
                View Form
              </button>
              
              <button
                onClick={handleDownloadForm}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Form
              </button>
              
              <Link
                to="/"
                className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
       
<div className="overflow-x-auto pb-2">
  <div className="flex items-center" style={{ minWidth: `${steps.length * 120}px` }}>
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center flex-shrink-0" style={{ width: '100px' }}>
          <div 
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep > step.id 
                ? 'bg-green-500 text-white' 
                : currentStep === step.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {currentStep > step.id ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <span className="text-sm">{step.id}</span>
            )}
          </div>
          <span className="text-xs mt-1 text-center text-gray-600 whitespace-nowrap overflow-ellipsis overflow-hidden max-w-full px-1">
            {step.title}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div 
            className={`h-1 mx-2 ${
              currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
            }`} 
            style={{ width: '40px' }}
          ></div>
        )}
      </React.Fragment>
    ))}
  </div>
</div>

        {/* Shareholder Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Shareholder Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg shadow-xs">
              <span className="text-blue-700 font-medium">REG ACCOUNT:</span>
              <p className="font-semibold text-gray-900 mt-1">{shareholder.reg_account_number}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-xs">
              <span className="text-blue-700 font-medium">NAME:</span>
              <p className="font-semibold text-gray-900 mt-1">{shareholder.name}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-xs">
              <span className="text-blue-700 font-medium">HOLDINGS:</span>
              <p className="font-semibold text-gray-900 mt-1">{shareholder.holdings.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-xs">
              <span className="text-blue-700 font-medium">RIGHTS ISSUE:</span>
              <p className="font-semibold text-gray-900 mt-1">{shareholder.rights_issue}</p>
            </div>
            </div>

            <div className="bg-gray-50 rounded-lg shadow-xs overflow-hidden mt-3 p-3">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BANK</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACCOUNT NAME</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACCOUNT NO</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                                          { bank: 'Providus Bank', account: 'Lasaco Assurance Plc Rights Proceeds Account', number: '1308407124' },
                      { bank: 'Taj Bank', account: 'Lasaco Assurance Plc Rights Proceeds Account', number: '0013161672' }
                    ].map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700">{item.bank}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.account}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {[
                { bank: 'Providus Bank', account: 'Lasaco Assurance Plc Rights Proceeds Account', number: '1308407124' },
                      { bank: 'Taj Bank', account: 'Lasaco Assurance Plc Rights Proceeds Account', number: '0013161672' }
                ].map((item, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg shadow-xs">
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500">BANK</div>
                      <div className="text-sm font-medium text-gray-700">{item.bank}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-500">ACCOUNT NAME</div>
                      <div className="text-sm text-gray-700">{item.account}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500">ACCOUNT NO</div>
                      <div className="text-sm text-gray-700">{item.number}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        
          
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          {/* Step Content */}
          <div className="space-y-6">
           
{currentStep === 1 && (
  <div className="space-y-6">
    {/* Existing notice */}
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex">
        <Info className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
        <p className="text-green-800">
          Please review your shareholder information above. Click Next to proceed with the form submission.
        </p>
      </div>
    </div>

    {/* Rights Issue Presentation */}
    <div className="text-center space-y-6">
      {/* Top Section: Application Dates */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <div className="border border-gray-300 rounded-md px-4 py-3 bg-white shadow-sm w-48">
          <h4 className="text-[11px] font-semibold text-gray-700 tracking-wide mb-0.5">APPLICATION LIST</h4>
          <p className="text-blue-700 font-semibold text-xs underline">OPENS:</p>
          <p className="text-gray-800 text-sm">5TH NOVEMBER 2025</p>
        </div>
        <div className="border border-gray-300 rounded-md px-4 py-3 bg-white shadow-sm w-48">
          <h4 className="text-[11px] font-semibold text-gray-700 tracking-wide mb-0.5">APPLICATION LIST</h4>
          <p className="text-blue-700 font-semibold text-xs underline">CLOSES:</p>
          <p className="text-gray-800 text-sm">12TH DECEMBER 2025</p>
        </div>
      </div>

      {/* Lead Issuing House */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase">Lead Issuing House</h3>
        <img
          src="https://res.cloudinary.com/apelng/image/upload/v1767701279/meristem_oxedsq.jpg"
          alt="Meristem Securities Limited"
          className="mx-auto h-10 object-contain mt-1"
        />
        <p className="text-xs text-gray-600 mt-1">RC: 610498</p>
      </div>

      {/* Joint Issuing House */}
      {/* <div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase">Joint Issuing House</h3>
        <img
          src="https://res.cloudinary.com/apelng/image/upload/v1761578597/fundvine_nvexlt.png"
          alt="Fundvine Capital & Securities Ltd"
          className="mx-auto h-10 object-contain mt-1"
        />
        <p className="text-xs text-gray-600 mt-1">RC: 1282258</p>
      </div> */}

      {/* On Behalf Of */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm uppercase">On Behalf Of</h3>
        <img
          src="https://res.cloudinary.com/apelng/image/upload/v1767701424/lasacopng_cx9rz2.png"
          alt="Lasaco Assurance Plc"
          className="mx-auto h-10 object-contain mt-1"
        />
        <p className="text-xs text-gray-600 mt-1">RC: 31126</p>
      </div>

      {/* Rights Issue Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg max-w-xl mx-auto px-4 py-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 text-base">Lasaco Assurance Plc</h4>
        <p className="text-xs text-gray-700 leading-relaxed mt-2">
          Rights Issue of <strong>177,996,310 Ordinary Shares</strong> of 50 Kobo Each at 
          <strong> ₦7.00 Per Share</strong> on the basis of 
          <strong> 1 new ordinary share</strong> for every 
          <strong> 5 existing ordinary shares</strong> held as at the close of business on 
          <strong> August 1st, 2025</strong>.
        </p>
      </div>
    </div>
  </div>
)}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">INSTRUCTIONS FOR COMPLETING THE PARTICIPATION FORM</h3>
                  <div className="text-sm text-gray-700 space-y-4 max-h-96 overflow-y-auto text-justify px-4 sm:px-6">
                    <p> <strong>1.</strong> Acceptance and/or renunciation must be made on this Participation Form.</p>

              <p> <strong>a.</strong> Any payment value exceeding &#8358;10 million should be made via SWIFT, RTGS or NEFT into the designated Issue Proceeds Account stated below:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Account Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bank Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Account Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                   
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Lasaco Assurance Plc Rights Proceeds Account</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Providus Bank Limited</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">1308407124</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Lasaco Assurance Plc Rights Proceeds Account</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">TAJ Bank Limited</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">0013161672</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p><strong>b.</strong> Evidence of all electronic transfers must be submitted to the Receiving Agents and the Issuing House. If payment is not received by Monday, November 24, 2025, the provisional allotment will be deemed to have been declined and will be cancelled.</p>

              <p><strong>4.</strong> Shareholders accepting their provisional allotment partially should complete box B and submit their Participation Forms to any of the Receiving Agents listed on pages 40 – 41 of the Rights Circular together with the evidence of payment transfer for the partial acceptance in accordance with 2 above.</p>

              <p><strong>5.</strong> Shareholders renouncing the provisional allotment partially or in full, who also wish to trade their rights on the floor of NGX should complete item (iii) of box B. They should obtain a Transfer Form from their stockbroker, complete it in accordance with these instructions, and return it to the stockbroker together with the completed Participation Form and the amount payable/evidence of transfer for any partial acceptance in accordance with 2 above.</p>
<p><strong>5.</strong> Shareholders renouncing the provisional allotment partially or in full, who also wish to trade their rights on the floor of NGX should complete item (iii) of box B. They should obtain a Transfer Form from their stockbroker, complete it in accordance with these instructions, and return it to the stockbroker together with the completed Participation Form and the amount payable/evidence of transfer for any partial acceptance in accordance with 2 above.</p>

<p><strong>6.</strong> Shareholders who wish to acquire additional shares over and above their provisional allotment should apply for additional shares by completing item (ii) and (iii) of box A.</p>

<p><strong>7.</strong> All cheques or bank drafts for amounts belo &#8358;10million will be presented for payment on receipt and all acceptances/applications in respect of which cheques are returned unpaid for any reason will be rejected and cancelled. Shareholders are advised to obtain an acknowledgement of the amount paid from the Receiving Agent through which this Participation Form is lodged.</p>

<p><strong>8.</strong> Joint allottees must sign on separate lines in the appropriate section of the Participation Form.</p>

<p><strong>9.</strong> Participation Forms of corporate allottees must bear their incorporation numbers and corporate seals and must be completed under the hands of duly authorised officials who should also state their designations.</p>


                 
                  </div>
                </div>

                <div className="flex items-start bg-blue-50 p-4 rounded-lg">
                  <input
                    type="checkbox"
                    id="instructions_read"
                    name="instructions_read"
                    checked={formData.instructions_read}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="instructions_read" className="text-sm text-gray-700">
                    I have read the INSTRUCTIONS FOR COMPLETING THE PARTICIPATION FORM.
                  </label>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stockbroker <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={stockbrokers}
                      value={formData.stockbroker}
                      onChange={handleInputChange}
                      name="stockbroker"
                      placeholder="Select Stockbroker"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CHN (Clearing House Number) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="chn"
                      value={formData.chn}
                      onChange={handleInputChange}
                      placeholder="Enter your CHN"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Either Full Acceptance/Additional Ordinary Share Request, Renunciation or Partial Acceptance<span className="text-red-500">*</span>
                    </label>
                    <select
                      name="action_type"
                      value={formData.action_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="">Select Action</option>
                      <option value="full_acceptance">FULL ACCEPTANCE / REQUEST FOR ADDITIONAL ORDINARY SHARES</option>
                      <option value="renunciation_partial">RENUNCIATION OR PARTIAL ACCEPTANCE</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

{currentStep === 5 && formData.action_type === 'full_acceptance' && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-start bg-blue-50 p-4 rounded-lg">
        <input
          type="checkbox"
          id="accept_full"
          name="accept_full"
          checked={formData.accept_full}
          onChange={handleInputChange}
          className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          required
        />
        <label htmlFor="accept_full" className="text-sm text-gray-700">
          I/We accept in full, the provisional allotment shown on the front of this form.
        </label>
      </div>

      <div className="flex items-start bg-blue-50 p-4 rounded-lg">
        <input
          type="checkbox"
          id="apply_additional"
          name="apply_additional"
          checked={formData.apply_additional}
          onChange={handleInputChange}
          className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="apply_additional" className="text-sm text-gray-700">
          I/We also apply for additional Ordinary Shares.
        </label>
      </div>

      {/* Additional Shares Section */}
      {formData.apply_additional && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Additional Ordinary Shares applied for
              </label>
              <input
                type="number"
                name="additional_shares"
                value={formData.additional_shares}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional amount payable at ₦7.00 per Share
              </label>
              <input
                type="text"
                name="additional_amount"
                value={`₦${calculatedAmount.toLocaleString()}`}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
              />
            </div>
          </div>

          <div className="flex items-start bg-blue-50 p-4 rounded-lg">
            <input
              type="checkbox"
              id="accept_smaller_allotment"
              name="accept_smaller_allotment"
              checked={formData.accept_smaller_allotment}
              onChange={handleInputChange}
              className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="accept_smaller_allotment" className="text-sm text-gray-700">
              I / We agree to accept the same or smaller number of additional shares in respect of which allotment may be made to me/us, in accordance with the Provisional Allotment Letter contained in the Rights Circular.
            </label>
          </div>
        </>
      )}

      {/* Payment Details Section */}
      <div className="border-t pt-6 mt-6">
        <h4 className="font-medium text-gray-900 mb-4 text-lg">Payment Details</h4>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Amount Due (Rights Issue):</span>
                <p className="font-bold text-blue-900 mt-1">₦{(parseFloat(formData.amount_due) || 0).toLocaleString()}</p>
              </div>
              {formData.apply_additional && formData.additional_amount && (
                <div>
                  <span className="text-blue-700 font-medium">Additional Amount:</span>
                  <p className="font-bold text-blue-900 mt-1">₦{(parseFloat(formData.additional_amount) || 0).toLocaleString()}</p>
                </div>
              )}
              <div className="md:col-span-2 border-t pt-3">
                <span className="text-blue-700 font-medium text-lg">Total Payment Amount:</span>
                <p className="font-bold text-blue-900 text-xl mt-1">₦{calculateTotalPayment().toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I/We enclose my/our cheque/bank draft/evidence of transfer for <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center max-w-md">
              <span className="mr-3 bg-gray-100 px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 font-medium">₦</span>
              <input
                type="text"
                name="payment_amount"
                value={`${calculateTotalPayment().toLocaleString()}`}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-bold text-gray-900 bg-gray-50"
              />
            </div>
          </div>

          {/* Payment Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank name {formData.apply_additional && formData.additional_shares > 0 && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cheque number
              </label>
              <input
                type="text"
                name="cheque_number"
                value={formData.cheque_number}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide cheque number only if payment was made by cheque
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide branch name only if payment was made by cheque
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

            {currentStep === 5 && formData.action_type === 'renunciation_partial' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Ordinary Shares accepted <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="shares_accepted"
                      value={formData.shares_accepted}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount payable at &#8358;7.00 per share<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount_payable"
                      value={formData.amount_payable}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Ordinary Shares renounced <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="shares_renounced"
                      value={formData.shares_renounced}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start bg-blue-50 p-4 rounded-lg">
                  <input
                    type="checkbox"
                    id="accept_partial"
                    name="accept_partial"
                    checked={formData.accept_partial}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="accept_partial" className="text-sm text-gray-700">
                    I/We accept only the number of Ordinary Shares shown in column (1) and enclose cheque/bank draft for the value shown in column (2) above details.
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque number
                    </label>
                    <input
                      type="text"
                      name="cheque_number"
                      value={formData.cheque_number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />

                     <p className="text-xs text-red-500 mt-1">
                  Provide cheque number only if payment was made by cheque
                </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />

                       <p className="text-xs text-red-500 mt-1">
                  Provide branch name only if payment was made by cheque
                </p>
                  </div>
                </div>

                <div className="flex items-start bg-blue-50 p-4 rounded-lg">
                  <input
                    type="checkbox"
                    id="renounce_rights"
                    name="renounce_rights"
                    checked={formData.renounce_rights}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="renounce_rights" className="text-sm text-gray-700">
                    I/We hereby renounce my/our rights to the Ordinary Shares in column (3), being the balance of the ordinary shares allocated to me / us.
                  </label>
                </div>

                <div className="flex items-start bg-blue-50 p-4 rounded-lg">
                  <input
                    type="checkbox"
                    id="trade_rights"
                    name="trade_rights"
                    checked={formData.trade_rights}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="trade_rights" className="text-sm text-gray-700">
                    I/We confirm that I/We wish to trade my/our renounced rights on the floor of The Exchange and will obtain a Transfer Form from my/our stockbroker, complete it in accordance with his instructions and return it to the stockbroker with the form.
                  </label>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Names <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next of kin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="next_of_kin"
                      value={formData.next_of_kin}
                      onChange={handleInputChange}
                      placeholder="Enter next of kin name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day time telephone number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="daytime_phone"
                      value={formData.daytime_phone}
                      onChange={handleInputChange}
                      placeholder="Enter daytime phone"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile (GSM) TELEPHONE NUMBER <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="mobile_phone"
                      value={formData.mobile_phone}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="font-medium text-gray-900 mb-4 text-lg">Bank Details for E-Dividend</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name of bank <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bank_name_edividend"
                        value={formData.bank_name_edividend}
                        onChange={handleInputChange}
                        placeholder="Enter bank name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch <span className="text-red-500"></span>
                      </label>
                      <input
                        type="text"
                        name="bank_branch_edividend"
                        value={formData.bank_branch_edividend}
                        onChange={handleInputChange}
                        placeholder="Enter branch name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      
                      />
                       <p className="text-xs text-red-500 mt-1">
                
                </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleInputChange}
                        placeholder="Enter account number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank verification number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bvn"
                        value={formData.bvn}
                        onChange={handleInputChange}
                        placeholder="Enter BVN"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="font-medium text-gray-900 mb-4 text-lg">Corporate Details (If Applicable)</h3>
                  <p className="text-sm text-red-600 font-medium mb-4">Skip this section if not corporate.</p>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name of Authorised Signatory 
                      </label>
                      <input
                        type="text"
                        name="corporate_signatory_names"
                        value={formData.corporate_signatory_names}
                        onChange={handleInputChange}
                        placeholder="Enter names of authorised signatories"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="corporate_designations"
                        value={formData.corporate_designations}
                        onChange={handleInputChange}
                        placeholder="Enter designations"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-2">
                      Signature( Select Single or Joint Account) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="signature_type"
                      value={formData.signature_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="single">Single</option>
                      <option value="joint">Joint</option>
                    </select>
                  </div>
                </div>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Upload Payment Receipt <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors duration-200 bg-gray-50">
                      <input
                        type="file"
                        id="receipt"
                        name="receipt"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleFileChange(e, 'receipt')}
                        className="hidden"
                        required
                      />
                      <label htmlFor="receipt" className="cursor-pointer block w-full">
                        {formData.receipt ? (
                          <div className="text-green-600">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                            <p className="font-medium break-words truncate max-w-full px-2">
                              {formData.receipt.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">Click to change file</p>
                          </div>
                        ) : (
                          <div className="text-gray-600">
                            <Receipt className="h-12 w-12 mx-auto mb-3" />
                            <p className="font-medium">Upload payment receipt</p>
                         <p className="text-sm text-gray-500">
  JPG, JPEG, PNG format Only! (Max 5MB)
</p>
                          </div>
                        )}
                      </label>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Upload proof of payment for the rights issue
                    </p>
                  </div>
            
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Upload Signature(s) <span className="text-red-500">*</span>
                    </label>
                    
                    {formData.signature_type === 'single' ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors duration-200 bg-gray-50">
                        <input
                          type="file"
                          id="signature_single"
                          name="signature_single"
                          accept="image/jpeg,image/jpg,image/png" 
                          onChange={(e) => handleFileChange(e, 'signatures', 0)}
                          className="hidden"
                          required
                        />
                        <label htmlFor="signature_single" className="cursor-pointer block w-full">
                          {formData.signatures[0] ? (
                            <div className="text-green-600">
                              <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                              <p className="font-medium break-words truncate max-w-full px-2">
                                {formData.signatures[0].name}
                              </p>
                              <p className="text-sm text-gray-500 mt-2">Click to change file</p>
                            </div>
                          ) : (
                            <div className="text-gray-600">
                              <FileText className="h-12 w-12 mx-auto mb-3" />
                              <p className="font-medium">Upload signature file</p>
                            <p className="text-sm text-gray-500 mt-2">
  {formData.signature_type === 'single' 
    ? 'Provide your signature (scan or clear photo) - JPG, JPEG, or PNG only' 
    : 'Each joint allottee must provide their signature - JPG, JPEG, or PNG only'}
</p>
                            </div>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.signatures.map((signature, index) => (
                          <div key={index} className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-green-400 transition-colors duration-200 bg-gray-50">
                            <input
                              type="file"
                              id={`signature_${index}`}
                              name={`signature_${index}`}
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={(e) => handleFileChange(e, 'signatures', index)}
                              className="hidden"
                              required
                            />
                            <label htmlFor={`signature_${index}`} className="cursor-pointer block w-full">
                              {signature ? (
                                <div className="text-green-600">
                                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                  <p className="font-medium break-words truncate max-w-full px-2 text-sm">
                                    {signature.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                                </div>
                              ) : (
                                <div className="text-gray-600">
                                  <FileText className="h-8 w-8 mx-auto mb-2" />
                                  <p className="font-medium text-sm">Upload signature {index + 1}</p>
                                  <p className="text-xs text-gray-500">PDF, JPG, or PNG format</p>
                                </div>
                              )}
                            </label>
                            {formData.signatures.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSignatureField(index)}
                                className="mt-2 text-red-600 text-sm hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSignatureField}
                          className="text-blue-600 text-sm hover:text-blue-800 flex items-center justify-center w-full py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                          Add another signature
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {formData.signature_type === 'single' 
                        ? 'Provide your signature (scan or clear photo)' 
                        : 'Each joint allottee must provide their signature'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Form Summary</h3>
                  
                  <div className="space-y-8">
                    {/* Shareholder Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4 text-md border-b pb-2">Shareholder Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Registration Account:</span>
                          <p className="font-medium mt-1">{formData.reg_account_number}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium mt-1">{formData.name}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Holdings:</span>
                          <p className="font-medium mt-1">{formData.holdings.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Rights Issue:</span>
                          <p className="font-medium mt-1">{formData.rights_issue}</p>
                        </div>

                         <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Amount Due:</span>
                          <p className="font-medium mt-1">{formData.amount_due}</p>
                        </div>
                      </div>
                    </div>
            
                    {/* Stockbroker & CHN Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4 text-md border-b pb-2">Stockbroker & CHN Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Stockbroker:</span>
                          <p className="font-medium mt-1">
                            {stockbrokers.find(b => b.id === formData.stockbroker)?.name || formData.stockbroker}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">CHN:</span>
                          <p className="font-medium mt-1">{formData.chn}</p>
                        </div>
                      </div>
                    </div>
            
                    {/* Action Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4 text-md border-b pb-2">Action Details</h4>
                      <div className="text-sm space-y-3">
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Action Type:</span>
                          <p className="font-medium mt-1">{formData.action_type === 'full_acceptance' ? 'Full Acceptance / Request for Additional Ordinary Shares' : 'Renunciation or Partial Acceptance'}</p>
                        </div>
                        
                        {formData.action_type === 'full_acceptance' ? (
                          <>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Accept Full Allotment:</span>
                              <p className="font-medium mt-1">{formData.accept_full ? 'Yes' : 'No'}</p>
                            </div>
                            {formData.apply_additional && (
                              <>
                                <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Additional Shares Applied:</span>
                                  <p className="font-medium mt-1">{formData.additional_shares}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Additional Amount Payable:</span>
                                  <p className="font-medium mt-1">₦{parseFloat(formData.additional_amount || 0).toLocaleString()}</p>
                                </div>
                                {/* <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Accept Smaller Allotment:</span>
                                  <p className="font-medium mt-1">{formData.accept_smaller_allotment ? 'Yes' : 'No'}</p>
                                </div> */}
                              </>
                            )}
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Payment Amount:</span>
                              <p className="font-medium mt-1">₦{calculateTotalPayment().toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Bank:</span>
                              <p className="font-medium mt-1">{formData.bank_name}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Cheque Number:</span>
                              <p className="font-medium mt-1">{formData.cheque_number}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Branch:</span>
                              <p className="font-medium mt-1">{formData.branch}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Shares Accepted:</span>
                              <p className="font-medium mt-1">{formData.shares_accepted}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Amount Payable:</span>
                              <p className="font-medium mt-1">₦{parseFloat(formData.amount_payable || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Shares Renounced:</span>
                              <p className="font-medium mt-1">{formData.shares_renounced}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Accept Partial:</span>
                              <p className="font-medium mt-1">{formData.accept_partial ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Renounce Rights:</span>
                              <p className="font-medium mt-1">{formData.renounce_rights ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Trade Rights:</span>
                              <p className="font-medium mt-1">{formData.trade_rights ? 'Yes' : 'No'}</p>
                            </div>
                            {formData.bank_name && (
                              <>
                                <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Bank:</span>
                                  <p className="font-medium mt-1">{formData.bank_name}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Cheque Number:</span>
                                  <p className="font-medium mt-1">{formData.cheque_number}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg">
                                  <span className="text-gray-600">Branch:</span>
                                  <p className="font-medium mt-1">{formData.branch}</p>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
            
                    {/* Personal & Bank Information */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4 text-md border-b pb-2">Personal & Bank Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Contact Name:</span>
                          <p className="font-medium mt-1">{formData.contact_name}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Next of Kin:</span>
                          <p className="font-medium mt-1">{formData.next_of_kin}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Daytime Phone:</span>
                          <p className="font-medium mt-1">{formData.daytime_phone}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Mobile Phone:</span>
                          <p className="font-medium mt-1">{formData.mobile_phone}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Email:</span>
                          <p className="font-medium mt-1">{formData.email}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">E-Dividend Bank:</span>
                          <p className="font-medium mt-1">{formData.bank_name_edividend}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Branch:</span>
                          <p className="font-medium mt-1">{formData.bank_branch_edividend}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Account Number:</span>
                          <p className="font-medium mt-1">{formData.account_number}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">BVN:</span>
                          <p className="font-medium mt-1">{formData.bvn}</p>
                        </div>
                        {formData.corporate_signatory_names && (
                          <>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Corporate Signatories:</span>
                              <p className="font-medium mt-1">{formData.corporate_signatory_names}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <span className="text-gray-600">Designations:</span>
                              <p className="font-medium mt-1">{formData.corporate_designations}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
            
                    {/* Signature & Receipt */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4 text-md border-b pb-2">Signature & Receipt</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Signature Type:</span>
                          <p className="font-medium mt-1">{formData.signature_type === 'single' ? 'Single' : 'Joint'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <span className="text-gray-600">Receipt Uploaded:</span>
                          <p className="font-medium mt-1">{formData.receipt ? formData.receipt.name : 'No file uploaded'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg md:col-span-2">
                          <span className="text-gray-600">Signatures Uploaded:</span>
                          <p className="font-medium mt-1">
                            {formData.signatures.filter(s => s).length} file(s)
                            {formData.signatures.filter(s => s).map((s, i) => (
                              <span key={i} className="block truncate text-sm mt-1">{s.name}</span>
                            ))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRADING IN RIGHTS Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">C. TRADING IN RIGHTS</h4>
                  <div className="text-sm text-gray-700 space-y-4">
                    <p>
                      <strong>i)</strong> Shareholders who wish to trade in their rights partially or in full may trade such rights on the floor of NGX. The rights will be traded actively on the floor of NGX.
                    </p>
                    <p>
                      <strong>ii)</strong> Shareholders who wish to acquire additional shares over and above their provisional allotment should apply for additional shares by completing items (ii) and (iii) of box A above.
                    </p>
                    <p>
                      <strong>iii)</strong> Shareholders who purchase rights on the floor of NGX are guaranteed the number of shares purchased: they will not be subject to the allotment process with respect to shares so purchased. Those that apply for additional shares by completing item (ii) of box A will be subject to the allotment process i.e., they may be allotted a smaller number of additional shares than what they applied for.
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FileText className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-md font-medium text-yellow-800">
                        Ready to Submit
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Please review all information above. Once submitted, you will be able to view and download your completed form.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormSubmissionPage;