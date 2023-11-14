"use client";

import { useRef, useState, useEffect } from 'react';
import { TabsTrigger, TabsList, TabsContent, Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { v4 as uuidv4 } from 'uuid';
import ClipLoader from 'react-spinners/ClipLoader';


export default function Component() {
  const [isRecording, setIsRecording] = useState(false);
  interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: (event: any) => void; // Define more specific type for event if needed
    onend: (event: any) => void; 
    // Add other properties and methods you need from SpeechRecognition
  }
  
  const stage = "test-latest"
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null); // Holds the reference to the search input
  const [searchResults, setSearchResults] = useState([]); // Store search results
  const [loading, setLoading] = useState(false);

  const [uploadStatus, setUploadStatus] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [labels, setLabels] = useState('');

  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Set the selected file
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleLabelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Set the labels
    setLabels(e.target.value);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission

    setUploadStatus(''); // Reset upload status

    if (selectedFile) {
      // Generate a unique filename with a UUID
      const uniqueId = uuidv4(); // Use a function from a library like `uuid`
      const fileExtension = selectedFile.name.split('.').pop();
      const uniqueFileName = `${uniqueId}.${fileExtension}`;
      
      const customLabels = labels.toLowerCase().split(',').map(label => label.trim()).join(',');

      console.log(uniqueFileName);
      console.log(selectedFile);
      console.log(customLabels);
  
      try {
        const response = await fetch(`https://bb60usynxd.execute-api.us-east-1.amazonaws.com/${stage}/upload/b2-ccbd-asgn2/${encodeURIComponent(uniqueFileName)}`, {
          method: 'PUT',
          body: selectedFile, // Directly send the file as the body of the request
          headers: {
            'Content-Type': selectedFile.type,
            'x-amz-meta-customLabels': customLabels
          },
        });

        console.log("Sent request to upload file endpoint.");

        if (response.ok) {
          // Handle success - No need to call response.json() for S3 PUT operation
          console.log("File uploaded successfully.");
          setUploadStatus('Successfully uploaded image!');
        } else {
          // Handle errors
          console.error('File upload failed:', response.statusText);
          setUploadStatus(`Failed to upload image: ${response.statusText}.`);
        }
      } catch (error) {
        // Handle errors
        console.error('There was an error uploading the file:', error);
        setUploadStatus(`Error uploading image: ${error}.`);
      }
    }
};


  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
      }
  
      // Now, it's safe to set properties on recognitionRef.current
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Keep listening even if the user pauses
        recognitionRef.current.interimResults = true; // Set to true to get interim results
  
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
        
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              interimTranscript += transcript; // Append final result to interimTranscript
            } else {
              interimTranscript += transcript; // Concatenate interim results
            }
          }
          
          // Set the value of the search input to its current value plus the new interimTranscript
          if (searchInputRef.current) {
            searchInputRef.current.value = interimTranscript;
          }
        };
  
        recognitionRef.current.onend = () => {
          // When recognition ends, update the state
          setIsRecording(false);
        };
      }
    }
  }, []); 

  const toggleVoiceInput = () => {
    if (isRecording) {
      // Stop recognition if it is currently recording
      recognitionRef.current && recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      // Start recognition if it is not currently recording
      recognitionRef.current && recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSearch = async () => {
    const query = searchInputRef.current?.value;
    if (query) {
      setLoading(true); // Start loading
      const url = `https://bb60usynxd.execute-api.us-east-1.amazonaws.com/${stage}/search?q=${encodeURIComponent(query)}`;
      try {
        const response = await fetch(url);
        const data = await response.json();

        setSearchResults(data.imagePaths);
      } catch (error) {
        console.error("There was an error fetching the search results:", error);
      } finally {
        setLoading(false); // Stop loading regardless of the outcome
      }
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <nav className="flex items-center justify-center p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Photo Album</h1>
      </nav>
      <div className="pr-40 pl-40 pt-32">
        <Tabs className="w-full" defaultValue="search">
          <TabsList className="flex justify-center border-b">
            <TabsTrigger className="px-4 py-2 text-center font-semibold text-zinc-900" value="search">
              Search
            </TabsTrigger>
            <TabsTrigger className="px-4 py-2 text-center font-semibold text-zinc-900" value="upload">
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <div className="space-y-4">
              <div className="relative">
                <Input 
                  className="pl-12 pr-14 rounded-md" 
                  id="search" 
                  ref={searchInputRef} 
                  placeholder="Search for images..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }} />
                <svg
                  className=" absolute left-3.5 top-2.5 h-5 w-5 text-zinc-500"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Button className="absolute right-0 top-0" size="icon" variant="ghost" onClick={toggleVoiceInput}>
                  {isRecording ? (
                    // Render this animated SVG when recording
                    <svg className="animate-pulse h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  ) : (
                    // Render this microphone SVG when not recording
                    <svg
                      className=" h-5 w-5"
                      fill="none"
                      height="24"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  )}
                  <span className="sr-only">Voice Search</span>
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">* Click the microphone button to record and again to stop when it is flashing.</p> 
              <div className="flex justify-center">
                <Button onClick={handleSearch}>
                  Search
                </Button>
              </div>

              {loading && 
                <div className="flex justify-center">
                  <ClipLoader size={30} />
                </div>
              }

              <div className="grid grid-cols-4 gap-4">
                {/* Iterate through searchResults and display images */}
                {searchResults && searchResults.map((imagePath, index) => (
                  <a href={imagePath} target="_blank">
                    <img
                      key={index}
                      alt={`Search result ${index}`}
                      className="rounded-md"
                      src={imagePath}
                      style={{
                        aspectRatio: "400/400",
                        objectFit: "cover",
                      }}
                      width="400"
                      height="400"
                    />
                  </a>
                ))}
              </div>

              {/* <div className="grid grid-cols-4 gap-4">
                <img
                  alt="Placeholder 1"
                  className="rounded-md"
                  height="200"
                  src="https://b2-ccbd-asgn2.s3.amazonaws.com/tree_test.jpg"
                  style={{
                    aspectRatio: "200/200",
                    objectFit: "cover",
                  }}
                  width="200"
                />
                <img
                  alt="Placeholder 2"
                  className="rounded-md"
                  height="200"
                  src="https://b2-ccbd-asgn2.s3.amazonaws.com/dog_test.png"
                  style={{
                    aspectRatio: "200/200",
                    objectFit: "cover",
                  }}
                  width="200"
                />
                <img
                  alt="Placeholder 3"
                  className="rounded-md"
                  height="200"
                  src="/placeholder.svg"
                  style={{
                    aspectRatio: "200/200",
                    objectFit: "cover",
                  }}
                  width="200"
                />
                <img
                  alt="Placeholder 4"
                  className="rounded-md"
                  height="200"
                  src="/placeholder.svg"
                  style={{
                    aspectRatio: "200/200",
                    objectFit: "cover",
                  }}
                  width="200"
                />
              </div> */}
            </div> 
          </TabsContent>
          <TabsContent value="upload">
            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="relative">
                <Label htmlFor="file">Upload Photo:</Label>
                <Input className="mt-1 rounded-md" id="file" type="file" onChange={handleFileChange} />
              </div>
              <div className="relative">
                <Label htmlFor="labels">Labels:</Label>
                <Input className="mt-1 rounded-md" id="labels" placeholder="Enter labels separated by commas..." onChange={handleLabelsChange} />
              </div>
              <Button type="submit" className="w-full">Upload</Button>
              {uploadStatus && (
                <p className={`mt-4 text-center ${uploadStatus.startsWith('Successfully') ? 'text-green-500' : 'text-red-500'}`}>
                  {uploadStatus}
                </p>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

