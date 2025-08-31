'use client'

import { useState, useEffect, useRef } from "react"

export default function MenuFiltroStatus(){
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() =>{
        function handleClickOutside (event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
    <div className="border-gray-600 border-2 rounded-md text-2xl justify-items-center right-0 mt-2 shadow-lg bg-gray-300 z-50 relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-black-600 text-gray-600 px-4 py-2 rounded-md hover:bg-lime-200 transition"
      >
        Status ▼
      </button>

      {open && (
        <div className="flex border-gray-600 border-2 rounded-md text-2xl justify-items-center absolute right-0 mt-2 shadow-lg bg-gray-300 ring-1 ring-gray-600 ring-opacity-4 z-50">
          <ul className=" text-gray-600">
            <li>
              <a href="#1" className="block px-4 py-2 hover:bg-lime-200 rounded-t-lg">Todos</a>
            </li>
            <li>
              <a href="#2" className="block w-full px-4 py-2 hover:bg-lime-200">Open</a>
            </li>
            <li>
              <a href="#3" className="block w-full px-4 py-2 hover:bg-lime-200 rounded-b-lg">Closed</a>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}